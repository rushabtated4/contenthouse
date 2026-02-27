import { create } from "zustand";
import type { TextBlock, EditorSlide, ExtractedSlide, EditorStateJson, OverlayImage, ElementGroup } from "@/types/editor";
import { DEFAULT_BG_PROMPT, DEFAULT_TEXT_BLOCK, DEFAULT_OVERLAY_IMAGE, MAX_HISTORY, CANVAS_WIDTH, ASPECT_RATIOS } from "@/lib/editor/defaults";
import type { AspectRatio } from "@/lib/editor/defaults";
import type { GeneratedImage } from "@/types/database";

type LoadingStatus = "idle" | "loading" | "done" | "error";

interface EditorState {
  // Core state
  videoId: string | null;
  originalSlides: string[]; // original image URLs
  slides: EditorSlide[];
  activeSlideIndex: number;
  selectedIds: string[];

  // Undo/redo
  history: EditorSlide[][];
  future: EditorSlide[][];

  // Save state
  savedSetId: string | null;
  saveStatus: LoadingStatus;
  isDirty: boolean;

  // Dirty slide tracking (for update generation)
  dirtySlideIndexes: Set<number>;
  updateGenerationStatus: LoadingStatus;

  // Loading states
  aspectRatio: AspectRatio;
  extractionStatus: LoadingStatus;
  bgGenerationStatus: Record<number, LoadingStatus>; // per slide index
  exportStatus: LoadingStatus;
  outputFormat: "png" | "jpeg" | "webp";

  // Extract text modal state
  extractTextModalOpen: boolean;
  extractedResults: ExtractedSlide[] | null;

  // Actions
  setAspectRatio: (ratio: AspectRatio) => void;
  initFromVideo: (videoId: string, originalImages: string[]) => void;
  reset: () => void;
  setActiveSlide: (index: number) => void;

  // Selection (multi-select)
  selectElement: (id: string | null, additive?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: (slideIndex: number) => void;

  // Text mutations
  updateTextBlock: (slideIndex: number, blockId: string, updates: Partial<TextBlock>) => void;
  addTextBlock: (slideIndex: number) => void;
  deleteTextBlock: (slideIndex: number, blockId: string) => void;

  // Overlay CRUD
  addOverlayImage: (slideIndex: number, imageUrl: string, naturalWidth?: number, naturalHeight?: number) => void;
  updateOverlayImage: (slideIndex: number, overlayId: string, updates: Partial<OverlayImage>) => void;
  deleteOverlayImage: (slideIndex: number, overlayId: string) => void;

  // Z-order
  bringToFront: (slideIndex: number) => void;
  sendToBack: (slideIndex: number) => void;
  moveForward: (slideIndex: number) => void;
  moveBackward: (slideIndex: number) => void;

  // Grouping
  groupSelected: (slideIndex: number) => void;
  ungroupSelected: (slideIndex: number) => void;
  moveGroupElements: (slideIndex: number, groupId: string, deltaXPercent: number, deltaYPercent: number, excludeId?: string) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;

  // BG mutations
  setBackgroundFromLibrary: (slideIndex: number, url: string, libraryId: string) => void;
  setBackgroundFromUpload: (slideIndex: number, url: string) => void;
  setBackgroundColor: (slideIndex: number, color: string | null) => void;
  setBackgroundTint: (slideIndex: number, color: string | null, opacity: number) => void;
  applyTintToAll: (color: string | null, opacity: number) => void;
  applyBackgroundToAll: (url: string, libraryId: string | null) => void;
  autoApplyBackgrounds: (backgrounds: { url: string; libraryId: string }[]) => void;
  updateBgPrompt: (slideIndex: number, prompt: string) => void;

  // Slide management
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  removeSlide: (index: number) => void;
  addBlankSlide: () => void;
  clearSlides: (options: { text: boolean; background: boolean; overlay: boolean }) => void;

  // Async actions (call API routes, update state)
  extractText: () => Promise<void>;
  extractTextForSlide: (slideIndex: number) => Promise<void>;
  generateBackground: (slideIndex: number) => Promise<void>;
  generateAllBackgrounds: () => Promise<void>;
  exportZip: () => Promise<Blob | null>;

  // Extract text modal actions
  openExtractTextModal: () => void;
  closeExtractTextModal: () => void;
  applyExtractedText: () => void;
  updateExtractedBlock: (slideIndex: number, blockIndex: number, updates: Partial<TextBlock>) => void;

  // Set extracted text (internal)
  setExtractedText: (slides: ExtractedSlide[]) => void;
  setOutputFormat: (format: "png" | "jpeg" | "webp") => void;

  // Whether generated_images rows exist for this set
  hasGeneratedImages: boolean;

  // Update generation (overwrite generated_images with editor changes)
  updateGeneration: () => Promise<void>;

  // Create generation (render all slides into new generated_images rows)
  createGeneration: () => Promise<void>;

  // Save/load
  saveEditorState: () => Promise<void>;
  loadEditorState: (videoId: string) => Promise<void>;

  // Init from completed generation set
  initFromGeneratedSet: (videoId: string, setId: string, generatedImages: GeneratedImage[], originalImages: string[]) => void;
  loadEditorStateBySetId: (setId: string) => Promise<void>;
}

/** Convert blob: URLs to base64 data URLs (no-op for non-blob URLs) */
async function blobUrlToDataUrl(url: string): Promise<string> {
  if (!url.startsWith("blob:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Resolve any blob URLs in slide data before sending to server */
async function resolveSlideUrls(slide: {
  backgroundUrl: string | null;
  backgroundColor: string | null;
  backgroundTintColor: string | null;
  backgroundTintOpacity: number;
  originalImageUrl: string;
  textBlocks: TextBlock[];
  overlayImages: OverlayImage[];
}) {
  return {
    ...slide,
    backgroundUrl: slide.backgroundUrl ? await blobUrlToDataUrl(slide.backgroundUrl) : null,
    overlayImages: await Promise.all(
      slide.overlayImages.map(async (o) => ({
        ...o,
        imageUrl: await blobUrlToDataUrl(o.imageUrl),
      }))
    ),
  };
}

function makeSlideId() {
  return crypto.randomUUID();
}

function makeBlockId() {
  return crypto.randomUUID();
}

/** For slides after the first, swap paraphrased text to be the primary text shown/applied */
function swapParaphrasedText(slides: ExtractedSlide[]): ExtractedSlide[] {
  return slides.map((es) => ({
    ...es,
    blocks: es.blocks.map((b) => {
      if (es.slideIndex > 0 && b.paraphrasedText) {
        return {
          ...b,
          text: b.paraphrasedText,
          paraphrasedText: b.text,
        };
      }
      return b;
    }),
  }));
}

function makeEmptySlide(): EditorSlide {
  return {
    id: makeSlideId(),
    originalImageUrl: "",
    backgroundUrl: null,
    backgroundColor: null,
    backgroundLibraryId: null,
    bgPrompt: DEFAULT_BG_PROMPT,
    backgroundTintColor: null,
    backgroundTintOpacity: 0,
    textBlocks: [],
    overlayImages: [],
    groups: [],
  };
}

/** Migrate v1 editor state to v2 (add overlayImages, groups, zIndex) */
function migrateEditorState(state: EditorStateJson): EditorStateJson {
  if (state.version === 2) return state;
  return {
    ...state,
    version: 2,
    slides: state.slides.map((slide) => ({
      ...slide,
      backgroundColor: (slide as EditorSlide).backgroundColor ?? null,
      backgroundTintColor: (slide as EditorSlide).backgroundTintColor ?? null,
      backgroundTintOpacity: (slide as EditorSlide).backgroundTintOpacity ?? 0,
      overlayImages: (slide as EditorSlide).overlayImages ?? [],
      groups: (slide as EditorSlide).groups ?? [],
      textBlocks: slide.textBlocks.map((tb, i) => ({
        ...tb,
        zIndex: (tb as TextBlock).zIndex ?? i,
      })),
    })),
  };
}

/** Push current slides to history before mutation */
function withHistory(state: { slides: EditorSlide[]; history: EditorSlide[][]; future: EditorSlide[][]; dirtySlideIndexes: Set<number>; activeSlideIndex: number }, dirtyIndex?: number): { history: EditorSlide[][]; future: EditorSlide[][]; dirtySlideIndexes: Set<number> } {
  const snapshot = structuredClone(state.slides);
  const history = [...state.history, snapshot];
  if (history.length > MAX_HISTORY) history.shift();
  const dirtySlideIndexes = new Set(state.dirtySlideIndexes);
  const idx = dirtyIndex ?? state.activeSlideIndex;
  if (idx >= 0 && idx < state.slides.length) {
    dirtySlideIndexes.add(idx);
  }
  return { history, future: [], dirtySlideIndexes };
}

/** Get all element zIndexes in a slide */
function getAllZIndexes(slide: EditorSlide): number[] {
  const textZs = slide.textBlocks.map((b) => b.zIndex ?? 0);
  const overlayZs = slide.overlayImages.map((o) => o.zIndex ?? 0);
  return [...textZs, ...overlayZs];
}

const initialState = {
  videoId: null as string | null,
  originalSlides: [] as string[],
  slides: [] as EditorSlide[],
  activeSlideIndex: 0,
  selectedIds: [] as string[],
  history: [] as EditorSlide[][],
  future: [] as EditorSlide[][],
  savedSetId: null as string | null,
  saveStatus: "idle" as LoadingStatus,
  isDirty: false,
  hasGeneratedImages: false,
  dirtySlideIndexes: new Set<number>(),
  updateGenerationStatus: "idle" as LoadingStatus,
  aspectRatio: "2:3" as AspectRatio,
  extractionStatus: "idle" as LoadingStatus,
  bgGenerationStatus: {} as Record<number, LoadingStatus>,
  exportStatus: "idle" as LoadingStatus,
  outputFormat: "png" as "png" | "jpeg" | "webp",
  extractTextModalOpen: false,
  extractedResults: null as ExtractedSlide[] | null,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initialState,

  setAspectRatio: (ratio) => set({ aspectRatio: ratio, isDirty: true }),

  initFromVideo: (videoId, originalImages) => {
    const slides: EditorSlide[] = originalImages.map(() => makeEmptySlide());
    set({
      ...initialState,
      videoId,
      originalSlides: originalImages,
      slides,
      dirtySlideIndexes: new Set<number>(),
      updateGenerationStatus: "idle",
    });
    get().loadEditorState(videoId);
  },

  reset: () => set(initialState),

  setActiveSlide: (index) => set({ activeSlideIndex: index, selectedIds: [] }),

  // Multi-select
  selectElement: (id, additive) => {
    if (id === null) {
      set({ selectedIds: [] });
      return;
    }
    set((state) => {
      if (additive) {
        const existing = state.selectedIds.includes(id);
        return { selectedIds: existing ? state.selectedIds.filter((x) => x !== id) : [...state.selectedIds, id] };
      }
      return { selectedIds: [id] };
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  deleteSelected: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const ids = new Set(state.selectedIds);
      slide.textBlocks = slide.textBlocks.filter((b) => !ids.has(b.id));
      slide.overlayImages = slide.overlayImages.filter((o) => !ids.has(o.id));
      // Clean up groups
      slide.groups = slide.groups
        .map((g) => ({
          ...g,
          elementRefs: g.elementRefs.filter((ref) => !ids.has(ref.id)),
        }))
        .filter((g) => g.elementRefs.length >= 2);
      slides[slideIndex] = slide;
      return { slides, selectedIds: [], isDirty: true, ...hist };
    });
  },

  updateTextBlock: (slideIndex, blockId, updates) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      slide.textBlocks = slide.textBlocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      );
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  addTextBlock: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const maxZ = Math.max(0, ...getAllZIndexes(slide));
      const newBlock: TextBlock = {
        ...DEFAULT_TEXT_BLOCK,
        id: makeBlockId(),
        zIndex: maxZ + 1,
      };
      slide.textBlocks = [...slide.textBlocks, newBlock];
      slides[slideIndex] = slide;
      return { slides, selectedIds: [newBlock.id], isDirty: true, ...hist };
    });
  },

  deleteTextBlock: (slideIndex, blockId) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      slide.textBlocks = slide.textBlocks.filter((b) => b.id !== blockId);
      slide.groups = slide.groups
        .map((g) => ({ ...g, elementRefs: g.elementRefs.filter((ref) => ref.id !== blockId) }))
        .filter((g) => g.elementRefs.length >= 2);
      slides[slideIndex] = slide;
      return {
        slides,
        isDirty: true,
        selectedIds: state.selectedIds.filter((id) => id !== blockId),
        ...hist,
      };
    });
  },

  // Overlay CRUD
  addOverlayImage: (slideIndex, imageUrl, naturalWidth?, naturalHeight?) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const maxZ = Math.max(0, ...getAllZIndexes(slide));

      // Compute aspect-ratio-correct dimensions
      let widthPct = DEFAULT_OVERLAY_IMAGE.width;
      let heightPct = DEFAULT_OVERLAY_IMAGE.height;
      if (naturalWidth && naturalHeight && naturalWidth > 0 && naturalHeight > 0) {
        const aspectRatio = naturalWidth / naturalHeight;
        const canvasH = ASPECT_RATIOS[state.aspectRatio].height;
        // Start with 30% of canvas width, compute height to maintain aspect ratio
        const targetWidthPx = (widthPct / 100) * CANVAS_WIDTH;
        const targetHeightPx = targetWidthPx / aspectRatio;
        heightPct = (targetHeightPx / canvasH) * 100;
        // If too tall, constrain by height instead
        if (heightPct > 60) {
          heightPct = 40;
          const constrainedHeightPx = (heightPct / 100) * canvasH;
          const constrainedWidthPx = constrainedHeightPx * aspectRatio;
          widthPct = (constrainedWidthPx / CANVAS_WIDTH) * 100;
        }
      }

      const newOverlay: OverlayImage = {
        ...DEFAULT_OVERLAY_IMAGE,
        id: makeBlockId(),
        imageUrl,
        width: widthPct,
        height: heightPct,
        zIndex: maxZ + 1,
      };
      slide.overlayImages = [...slide.overlayImages, newOverlay];
      slides[slideIndex] = slide;
      return { slides, selectedIds: [newOverlay.id], isDirty: true, ...hist };
    });
  },

  updateOverlayImage: (slideIndex, overlayId, updates) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      slide.overlayImages = slide.overlayImages.map((o) =>
        o.id === overlayId ? { ...o, ...updates } : o
      );
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  deleteOverlayImage: (slideIndex, overlayId) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      slide.overlayImages = slide.overlayImages.filter((o) => o.id !== overlayId);
      slide.groups = slide.groups
        .map((g) => ({ ...g, elementRefs: g.elementRefs.filter((ref) => ref.id !== overlayId) }))
        .filter((g) => g.elementRefs.length >= 2);
      slides[slideIndex] = slide;
      return {
        slides,
        isDirty: true,
        selectedIds: state.selectedIds.filter((id) => id !== overlayId),
        ...hist,
      };
    });
  },

  // Z-order
  bringToFront: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const maxZ = Math.max(0, ...getAllZIndexes(slide));
      const ids = new Set(state.selectedIds);
      let nextZ = maxZ + 1;
      slide.textBlocks = slide.textBlocks.map((b) => ids.has(b.id) ? { ...b, zIndex: nextZ++ } : b);
      slide.overlayImages = slide.overlayImages.map((o) => ids.has(o.id) ? { ...o, zIndex: nextZ++ } : o);
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  sendToBack: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const minZ = Math.min(0, ...getAllZIndexes(slide));
      const ids = new Set(state.selectedIds);
      let nextZ = minZ - state.selectedIds.length;
      slide.textBlocks = slide.textBlocks.map((b) => ids.has(b.id) ? { ...b, zIndex: nextZ++ } : b);
      slide.overlayImages = slide.overlayImages.map((o) => ids.has(o.id) ? { ...o, zIndex: nextZ++ } : o);
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  moveForward: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const ids = new Set(state.selectedIds);
      // Collect all elements with zIndex
      type El = { id: string; zIndex: number };
      const allEls: El[] = [
        ...slide.textBlocks.map((b) => ({ id: b.id, zIndex: b.zIndex ?? 0 })),
        ...slide.overlayImages.map((o) => ({ id: o.id, zIndex: o.zIndex ?? 0 })),
      ];
      allEls.sort((a, b) => a.zIndex - b.zIndex);
      // For each selected element, find the next higher non-selected element and swap
      for (const el of allEls) {
        if (!ids.has(el.id)) continue;
        const idx = allEls.indexOf(el);
        for (let j = idx + 1; j < allEls.length; j++) {
          if (!ids.has(allEls[j].id)) {
            const tmpZ = el.zIndex;
            el.zIndex = allEls[j].zIndex;
            allEls[j].zIndex = tmpZ;
            break;
          }
        }
      }
      const zMap = new Map(allEls.map((e) => [e.id, e.zIndex]));
      slide.textBlocks = slide.textBlocks.map((b) => ({ ...b, zIndex: zMap.get(b.id) ?? b.zIndex }));
      slide.overlayImages = slide.overlayImages.map((o) => ({ ...o, zIndex: zMap.get(o.id) ?? o.zIndex }));
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  moveBackward: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const ids = new Set(state.selectedIds);
      type El = { id: string; zIndex: number };
      const allEls: El[] = [
        ...slide.textBlocks.map((b) => ({ id: b.id, zIndex: b.zIndex ?? 0 })),
        ...slide.overlayImages.map((o) => ({ id: o.id, zIndex: o.zIndex ?? 0 })),
      ];
      allEls.sort((a, b) => a.zIndex - b.zIndex);
      // Iterate in reverse: for each selected element, swap with next lower non-selected
      for (let i = allEls.length - 1; i >= 0; i--) {
        if (!ids.has(allEls[i].id)) continue;
        for (let j = i - 1; j >= 0; j--) {
          if (!ids.has(allEls[j].id)) {
            const tmpZ = allEls[i].zIndex;
            allEls[i].zIndex = allEls[j].zIndex;
            allEls[j].zIndex = tmpZ;
            break;
          }
        }
      }
      const zMap = new Map(allEls.map((e) => [e.id, e.zIndex]));
      slide.textBlocks = slide.textBlocks.map((b) => ({ ...b, zIndex: zMap.get(b.id) ?? b.zIndex }));
      slide.overlayImages = slide.overlayImages.map((o) => ({ ...o, zIndex: zMap.get(o.id) ?? o.zIndex }));
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  // Grouping
  groupSelected: (slideIndex) => {
    set((state) => {
      if (state.selectedIds.length < 2) return state;
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const allIds = new Set([
        ...slide.textBlocks.map((b) => b.id),
        ...slide.overlayImages.map((o) => o.id),
      ]);
      const refs = state.selectedIds
        .filter((id) => allIds.has(id))
        .map((id): { type: "textBlock" | "overlay"; id: string } => {
          if (slide.textBlocks.some((b) => b.id === id)) return { type: "textBlock", id };
          return { type: "overlay", id };
        });
      if (refs.length < 2) return state;
      const group: ElementGroup = { id: makeBlockId(), elementRefs: refs };
      slide.groups = [...slide.groups, group];
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  ungroupSelected: (slideIndex) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const ids = new Set(state.selectedIds);
      slide.groups = slide.groups.filter(
        (g) => !g.elementRefs.some((ref) => ids.has(ref.id))
      );
      slides[slideIndex] = slide;
      return { slides, isDirty: true, ...hist };
    });
  },

  moveGroupElements: (slideIndex, groupId, deltaXPercent, deltaYPercent, excludeId?) => {
    set((state) => {
      const slides = [...state.slides];
      const slide = { ...slides[slideIndex] };
      const group = slide.groups.find((g) => g.id === groupId);
      if (!group) return state;
      const ids = new Set(group.elementRefs.map((r) => r.id));
      if (excludeId) ids.delete(excludeId);
      slide.textBlocks = slide.textBlocks.map((b) =>
        ids.has(b.id) ? { ...b, x: b.x + deltaXPercent, y: b.y + deltaYPercent } : b
      );
      slide.overlayImages = slide.overlayImages.map((o) =>
        ids.has(o.id) ? { ...o, x: o.x + deltaXPercent, y: o.y + deltaYPercent } : o
      );
      slides[slideIndex] = slide;
      return { slides, isDirty: true };
    });
  },

  // Undo/redo
  undo: () => {
    set((state) => {
      if (state.history.length === 0) return state;
      const history = [...state.history];
      const previous = history.pop()!;
      const future = [structuredClone(state.slides), ...state.future];
      return { slides: previous, history, future, isDirty: true, selectedIds: [] };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;
      const future = [...state.future];
      const next = future.shift()!;
      const history = [...state.history, structuredClone(state.slides)];
      return { slides: next, history, future, isDirty: true, selectedIds: [] };
    });
  },

  setBackgroundFromLibrary: (slideIndex, url, libraryId) => {
    set((state) => {
      const slides = [...state.slides];
      slides[slideIndex] = {
        ...slides[slideIndex],
        backgroundUrl: url,
        backgroundColor: null,
        backgroundLibraryId: libraryId,
      };
      return { slides, isDirty: true };
    });
  },

  setBackgroundFromUpload: (slideIndex, url) => {
    set((state) => {
      const slides = [...state.slides];
      slides[slideIndex] = {
        ...slides[slideIndex],
        backgroundUrl: url,
        backgroundColor: null,
        backgroundLibraryId: null,
      };
      return { slides, isDirty: true };
    });
  },

  setBackgroundColor: (slideIndex, color) => {
    set((state) => {
      const slides = [...state.slides];
      slides[slideIndex] = {
        ...slides[slideIndex],
        backgroundColor: color,
        backgroundUrl: color ? null : slides[slideIndex].backgroundUrl,
        backgroundLibraryId: color ? null : slides[slideIndex].backgroundLibraryId,
      };
      return { slides, isDirty: true };
    });
  },

  setBackgroundTint: (slideIndex, color, opacity) => {
    set((state) => {
      const hist = withHistory(state, slideIndex);
      const slides = [...state.slides];
      slides[slideIndex] = {
        ...slides[slideIndex],
        backgroundTintColor: color,
        backgroundTintOpacity: opacity,
      };
      return { slides, isDirty: true, ...hist };
    });
  },

  applyTintToAll: (color, opacity) => {
    set((state) => {
      const hist = withHistory(state);
      return {
        isDirty: true,
        slides: state.slides.map((s) => ({
          ...s,
          backgroundTintColor: color,
          backgroundTintOpacity: opacity,
        })),
        ...hist,
      };
    });
  },

  applyBackgroundToAll: (url, libraryId) => {
    set((state) => ({
      isDirty: true,
      slides: state.slides.map((s) => ({
        ...s,
        backgroundUrl: url,
        backgroundColor: null,
        backgroundLibraryId: libraryId,
      })),
    }));
  },

  autoApplyBackgrounds: (backgrounds) => {
    if (backgrounds.length === 0) return;
    set((state) => {
      const hist = withHistory(state, 1);
      const newSlides = state.slides.map((slide, i) => {
        if (i === 0) return slide; // skip first slide
        const pick = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        return {
          ...slide,
          backgroundUrl: pick.url,
          backgroundColor: null,
          backgroundLibraryId: pick.libraryId,
        };
      });
      // Mark all slides except first as dirty
      const dirtySlideIndexes = new Set(hist.dirtySlideIndexes);
      for (let i = 1; i < newSlides.length; i++) {
        dirtySlideIndexes.add(i);
      }
      return { slides: newSlides, isDirty: true, ...hist, dirtySlideIndexes };
    });
  },

  updateBgPrompt: (slideIndex, prompt) => {
    set((state) => {
      const slides = [...state.slides];
      slides[slideIndex] = { ...slides[slideIndex], bgPrompt: prompt };
      return { slides, isDirty: true };
    });
  },

  reorderSlides: (fromIndex, toIndex) => {
    set((state) => {
      const slides = [...state.slides];
      const [moved] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, moved);
      return { slides, activeSlideIndex: toIndex, isDirty: true };
    });
  },

  removeSlide: (index) => {
    set((state) => {
      if (state.slides.length <= 1) return state;
      const slides = state.slides.filter((_, i) => i !== index);
      const activeSlideIndex = Math.min(state.activeSlideIndex, slides.length - 1);
      return { slides, activeSlideIndex, selectedIds: [], isDirty: true };
    });
  },

  addBlankSlide: () => {
    set((state) => ({
      slides: [...state.slides, makeEmptySlide()],
      activeSlideIndex: state.slides.length,
      isDirty: true,
    }));
  },

  clearSlides: ({ text, background, overlay }) => {
    set((state) => {
      const slides = state.slides.map((slide) => ({
        ...slide,
        ...(text ? { textBlocks: [] } : {}),
        ...(background ? {
          backgroundUrl: null,
          backgroundColor: null,
          backgroundLibraryId: null,
          backgroundTintColor: null,
          backgroundTintOpacity: 0,
        } : {}),
        ...(overlay ? { overlayImages: [] } : {}),
      }));
      return { slides, isDirty: true, selectedIds: [] };
    });
  },

  setExtractedText: (extractedSlides) => {
    set((state) => {
      const slides = [...state.slides];
      for (const es of extractedSlides) {
        if (es.slideIndex < slides.length) {
          slides[es.slideIndex] = {
            ...slides[es.slideIndex],
            textBlocks: es.blocks.map((b, i) => ({
              ...b,
              id: b.id || makeBlockId(),
              zIndex: b.zIndex ?? i,
            })),
          };
        }
      }
      return { slides, extractionStatus: "done", isDirty: true };
    });
  },

  setOutputFormat: (format) => set({ outputFormat: format, isDirty: true }),

  openExtractTextModal: () => set({ extractTextModalOpen: true }),

  closeExtractTextModal: () => set({ extractTextModalOpen: false, extractedResults: null }),

  applyExtractedText: () => {
    const { extractedResults } = get();
    if (!extractedResults) return;
    get().setExtractedText(extractedResults);
    set({ extractTextModalOpen: false, extractedResults: null, isDirty: true });
  },

  updateExtractedBlock: (slideIndex, blockIndex, updates) => {
    set((state) => {
      if (!state.extractedResults) return state;
      const results = state.extractedResults.map((es) => {
        if (es.slideIndex !== slideIndex) return es;
        const blocks = es.blocks.map((b, i) =>
          i === blockIndex ? { ...b, ...updates } : b
        );
        return { ...es, blocks };
      });
      return { extractedResults: results };
    });
  },

  extractText: async () => {
    const { videoId, slides, aspectRatio } = get();
    if (!videoId) return;
    set({ extractionStatus: "loading" });
    try {
      const res = await fetch("/api/editor/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          slideIndexes: slides.map((_, i) => i),
          aspectRatio,
        }),
      });
      if (!res.ok) throw new Error("Text extraction failed");
      const data = await res.json();
      // For slides after the first, swap paraphrased text to be the primary text
      const swapped = swapParaphrasedText(data.slides);
      set({
        extractedResults: swapped,
        extractTextModalOpen: true,
        extractionStatus: "done",
      });
    } catch {
      set({ extractionStatus: "error" });
    }
  },

  extractTextForSlide: async (slideIndex) => {
    const { videoId, aspectRatio } = get();
    if (!videoId) return;
    set({ extractionStatus: "loading" });
    try {
      const res = await fetch("/api/editor/extract-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, slideIndexes: [slideIndex], aspectRatio }),
      });
      if (!res.ok) throw new Error("Text extraction failed");
      const data = await res.json();
      const swapped = swapParaphrasedText(data.slides);
      set({
        extractedResults: swapped,
        extractTextModalOpen: true,
        extractionStatus: "done",
      });
    } catch {
      set({ extractionStatus: "error" });
    }
  },

  generateBackground: async (slideIndex) => {
    const { videoId, slides } = get();
    if (!videoId) return;
    set((state) => ({
      bgGenerationStatus: { ...state.bgGenerationStatus, [slideIndex]: "loading" },
    }));
    try {
      const res = await fetch("/api/editor/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          slideIndex,
          prompt: slides[slideIndex]?.bgPrompt,
        }),
      });
      if (!res.ok) throw new Error("Background generation failed");
      const data = await res.json();
      get().setBackgroundFromLibrary(slideIndex, data.imageUrl, data.libraryId);
      set((state) => ({
        bgGenerationStatus: { ...state.bgGenerationStatus, [slideIndex]: "done" },
      }));
    } catch {
      set((state) => ({
        bgGenerationStatus: { ...state.bgGenerationStatus, [slideIndex]: "error" },
      }));
    }
  },

  generateAllBackgrounds: async () => {
    const { videoId, slides } = get();
    if (!videoId) return;
    const indexes = slides.map((_, i) => i);
    const statusMap: Record<number, LoadingStatus> = {};
    indexes.forEach((i) => (statusMap[i] = "loading"));
    set({ bgGenerationStatus: statusMap });
    try {
      const res = await fetch("/api/editor/generate-background/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          slideIndexes: indexes,
          prompt: slides[0]?.bgPrompt,
        }),
      });
      if (!res.ok) throw new Error("Batch background generation failed");
      const data = await res.json();
      set((state) => {
        const newSlides = [...state.slides];
        const newStatus = { ...state.bgGenerationStatus };
        for (const bg of data.backgrounds) {
          if (bg.slideIndex < newSlides.length) {
            newSlides[bg.slideIndex] = {
              ...newSlides[bg.slideIndex],
              backgroundUrl: bg.imageUrl,
              backgroundLibraryId: bg.libraryId,
            };
          }
          newStatus[bg.slideIndex] = "done";
        }
        return { slides: newSlides, bgGenerationStatus: newStatus };
      });
    } catch {
      set((state) => {
        const newStatus = { ...state.bgGenerationStatus };
        indexes.forEach((i) => (newStatus[i] = "error"));
        return { bgGenerationStatus: newStatus };
      });
    }
  },

  exportZip: async () => {
    const { slides, outputFormat, aspectRatio } = get();
    set({ exportStatus: "loading" });
    try {
      const resolvedSlides = await Promise.all(
        slides.map((s) =>
          resolveSlideUrls({
            backgroundUrl: s.backgroundUrl,
            backgroundColor: s.backgroundColor ?? null,
            backgroundTintColor: s.backgroundTintColor ?? null,
            backgroundTintOpacity: s.backgroundTintOpacity ?? 0,
            originalImageUrl: s.originalImageUrl,
            textBlocks: s.textBlocks,
            overlayImages: s.overlayImages,
          })
        )
      );
      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: resolvedSlides,
          outputFormat,
          aspectRatio,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      set({ exportStatus: "done" });
      return blob;
    } catch {
      set({ exportStatus: "error" });
      return null;
    }
  },

  updateGeneration: async () => {
    const { savedSetId, dirtySlideIndexes, slides, outputFormat, aspectRatio } = get();
    if (!savedSetId || dirtySlideIndexes.size === 0) return;
    set({ updateGenerationStatus: "loading" });
    try {
      const dirtySlides = await Promise.all(
        Array.from(dirtySlideIndexes).map(async (idx) => ({
          editorIndex: idx,
          slide: await resolveSlideUrls({
            backgroundUrl: slides[idx].backgroundUrl,
            backgroundColor: slides[idx].backgroundColor ?? null,
            backgroundTintColor: slides[idx].backgroundTintColor ?? null,
            backgroundTintOpacity: slides[idx].backgroundTintOpacity ?? 0,
            originalImageUrl: slides[idx].originalImageUrl,
            textBlocks: slides[idx].textBlocks,
            overlayImages: slides[idx].overlayImages,
          }),
        }))
      );
      const res = await fetch("/api/editor/update-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: savedSetId, slides: dirtySlides, outputFormat, aspectRatio }),
      });
      if (!res.ok) throw new Error("Update generation failed");
      set({ updateGenerationStatus: "done", dirtySlideIndexes: new Set<number>() });
      // Also save editor state
      await get().saveEditorState();
    } catch {
      set({ updateGenerationStatus: "error" });
    }
  },

  createGeneration: async () => {
    const { savedSetId, slides, outputFormat, aspectRatio } = get();
    if (!savedSetId) return;
    set({ updateGenerationStatus: "loading" });
    try {
      const allSlides = await Promise.all(
        slides.map(async (slide, idx) => ({
          editorIndex: idx,
          slide: await resolveSlideUrls({
            backgroundUrl: slide.backgroundUrl,
            backgroundColor: slide.backgroundColor ?? null,
            backgroundTintColor: slide.backgroundTintColor ?? null,
            backgroundTintOpacity: slide.backgroundTintOpacity ?? 0,
            originalImageUrl: slide.originalImageUrl,
            textBlocks: slide.textBlocks,
            overlayImages: slide.overlayImages,
          }),
        }))
      );
      const res = await fetch("/api/editor/create-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: savedSetId, slides: allSlides, outputFormat, aspectRatio }),
      });
      if (!res.ok) throw new Error("Create generation failed");
      set({
        updateGenerationStatus: "done",
        dirtySlideIndexes: new Set<number>(),
        hasGeneratedImages: true,
      });
      // Also save editor state
      await get().saveEditorState();
    } catch {
      set({ updateGenerationStatus: "error" });
    }
  },

  saveEditorState: async () => {
    const { videoId, slides, aspectRatio, outputFormat, originalSlides, savedSetId } = get();
    if (!videoId) return;
    set({ saveStatus: "loading" });
    try {
      const editorState: EditorStateJson = {
        version: 2,
        aspectRatio,
        outputFormat,
        slides,
        originalSlides,
      };
      const res = await fetch("/api/editor/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, setId: savedSetId, editorState }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      set({ savedSetId: data.setId, saveStatus: "done", isDirty: false });
    } catch {
      set({ saveStatus: "error" });
    }
  },

  loadEditorState: async (videoId) => {
    try {
      const res = await fetch(`/api/editor/save?videoId=${videoId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.editorState && data.setId) {
        const state = migrateEditorState(data.editorState as EditorStateJson);
        set({
          savedSetId: data.setId,
          slides: state.slides,
          originalSlides: state.originalSlides,
          aspectRatio: state.aspectRatio,
          outputFormat: state.outputFormat,
          isDirty: false,
        });
      }
    } catch {
      // Silently fail — will use blank state
    }
  },

  initFromGeneratedSet: (videoId, setId, generatedImages, originalImages) => {
    const completedImages = generatedImages
      .filter((img) => img.status === "completed" && img.image_url)
      .sort((a, b) => a.slide_index - b.slide_index);

    const slides: EditorSlide[] = completedImages.map(() => makeEmptySlide());

    // Set generated images as backgrounds
    completedImages.forEach((img, i) => {
      slides[i].backgroundUrl = img.image_url;
    });

    set({
      ...initialState,
      videoId,
      originalSlides: originalImages,
      slides,
      savedSetId: setId,
      hasGeneratedImages: true,
      dirtySlideIndexes: new Set<number>(),
      updateGenerationStatus: "idle",
    });

    get().loadEditorStateBySetId(setId);
  },

  loadEditorStateBySetId: async (setId) => {
    try {
      const res = await fetch(`/api/editor/save?setId=${setId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.editorState && data.setId) {
        const state = migrateEditorState(data.editorState as EditorStateJson);
        set({
          savedSetId: data.setId,
          slides: state.slides,
          originalSlides: state.originalSlides,
          aspectRatio: state.aspectRatio,
          outputFormat: state.outputFormat,
          isDirty: false,
        });
      }
    } catch {
      // Silently fail — uses generated-image-based slides
    }
  },
}));
