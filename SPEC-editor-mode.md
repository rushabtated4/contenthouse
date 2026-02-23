# Spec: Editor Mode — Carousel Generation with Editable Text & Backgrounds

> **Status:** Draft
> **Date:** 2026-02-20
> **Location:** New tab ("Editor Mode") on the existing `/generate` page

---

## 1. Overview

A new carousel generation mode ("Editor Mode") alongside the existing "Quick Generate." Instead of generating a fully composited image in one shot, this mode:

1. **Extracts text** from each original slide via GPT-5.1 (structured JSON with positions, styles, colors)
2. **Generates text-free background images** by sending originals to an image model with a prompt to recreate without text
3. **Opens a canvas editor** where extracted text is overlaid on generated backgrounds, fully editable
4. **Exports** flattened images (text composited onto backgrounds) as a ZIP, 1080x1350, metadata stripped

The user has full control: edit text, reposition by dragging, change backgrounds per-slide or globally, add/delete text blocks, add/remove/reorder slides, upload custom backgrounds, and access a global background library.

---

## 2. Workflow

```
User selects video → Clicks "Editor Mode" tab
        │
        ▼
Editor opens showing ORIGINAL slides (no processing yet)
        │
        ├─► User clicks "Extract Text" → GPT-5.1 (1 call per slide)
        │       └─► Returns structured JSON per slide:
        │              { blocks: [{ text, x, y, width, height, fontSize, fontWeight, color, alignment }] }
        │
        ├─► User clicks "Generate Backgrounds" → Image model (1 call per slide)
        │       └─► Sends original slide + auto-generated prompt ("recreate without text")
        │              User can edit prompt before generating
        │              Returns text-free background image per slide
        │
        ▼
Editor renders: backgrounds as layers, text blocks as draggable overlays
        │
        ├─► User edits text, repositions, changes styles
        ├─► User swaps backgrounds (regenerate, upload, library, apply-to-all)
        ├─► User adds/deletes text blocks, reorders/adds/removes slides
        │
        ▼
User clicks "Download" → Flatten all slides → ZIP (1080x1350, metadata stripped)
```

---

## 3. Text Extraction (GPT-5.1)

### API Call
- **Model:** GPT-5.1 (vision)
- **Strategy:** One API call per slide (not batched)
- **Input:** Single slide image
- **Output:** Structured JSON

### Response Schema
```typescript
interface ExtractedSlide {
  slideIndex: number;
  blocks: ExtractedTextBlock[];
}

interface ExtractedTextBlock {
  id: string;                  // Generated UUID
  text: string;                // The text content (may contain line breaks)
  x: number;                   // X position as % of canvas width (0-100)
  y: number;                   // Y position as % of canvas height (0-100)
  width: number;               // Width as % of canvas width
  height: number;              // Height as % of canvas height
  fontSize: number;            // Font size in px (relative to 1080px canvas width)
  fontWeight: "regular" | "medium" | "bold" | "extra-bold";
  color: string;               // Hex color extracted from original (e.g. "#FFFFFF")
  alignment: "left" | "center" | "right";
  hasBorder: boolean;          // Whether the original text had a stroke/outline
  borderColor?: string;        // Hex color of the border if present
  borderThickness?: number;    // 1 = thin, 2 = medium, 3 = thick
}
```

### Prompt Template
```
Analyze this TikTok carousel slide image. Extract ALL text visible in the image.

For each text block, return:
- The exact text content
- Position (x, y as percentage of image dimensions, measured from top-left of the text block)
- Size (width, height as percentage of image dimensions)
- Font size in pixels (assuming the image is 1080px wide)
- Font weight (regular, medium, bold, extra-bold)
- Text color as hex
- Text alignment (left, center, right)
- Whether the text has a border/stroke/outline
- Border color and thickness if present

Return as JSON matching this schema: { blocks: [...] }
```

---

## 4. Background Generation

### API Call
- **Model:** GPT image model (gpt-image-1 or successor)
- **Strategy:** One call per slide
- **Input:** Original slide image + editable prompt
- **Default prompt:** `"Recreate this image faithfully but remove ALL text overlays. Fill in the areas where text was with the surrounding background pattern/colors. No text should be visible in the output."`
- **User can edit** the prompt before triggering generation (e.g., "make it more vibrant", "change to blue tones")

### Auto-save to Library
- Every generated background is automatically saved to the global background library
- When a user regenerates a background (replace in-place), the previous background is auto-saved to the library before being replaced

### Background Sources (per slide)
1. **AI-generated** — from the prompt + original image
2. **Upload** — user uploads their own image
3. **Library** — pick from previously generated/uploaded backgrounds (global, cross-carousel)

### Apply to All
- User can select any background and click "Apply to All Slides" to use it across the entire carousel

---

## 5. Canvas Editor

### Technology
- **Konva.js** (`react-konva`) — React-friendly canvas library with built-in drag, text rendering, and image compositing
- Chosen over DOM-based (harder to export consistently) and Fabric.js (less React-friendly)

### Canvas Dimensions
- Working canvas: **1080 x 1350** (2:3 TikTok ratio)
- Display: scaled to fit viewport, maintaining aspect ratio

### Font
- **TikTok Sans** — self-hosted, need to source font files
- Weights: Regular, Medium, Bold, Extra-Bold
- Fallback: DM Sans or Inter until TikTok Sans is acquired

### Text Block Features
| Feature | Details |
|---|---|
| **Edit text** | Click to enter edit mode. Supports multi-line. |
| **Font size** | Adjustable per block (px, relative to 1080w canvas) |
| **Font weight** | Regular / Medium / Bold / Extra-Bold |
| **Text color** | Color picker. Starts with extracted color from original. |
| **Alignment** | Left / Center / Right per block |
| **Border (stroke)** | Toggle on/off + color picker + thickness (thin / medium / thick) |
| **Drag to reposition** | Drag text blocks anywhere on the canvas |
| **Add new block** | "Add Text" button creates a new text block with defaults |
| **Delete block** | Delete button per block, or select + keyboard delete |
| **Bulk color reset** | "Reset to white" or "Apply color to all blocks" action |

### Slide Management
| Feature | Details |
|---|---|
| **Reorder slides** | Drag-and-drop in the slide strip/filmstrip |
| **Remove slide** | Delete button per slide (with confirmation) |
| **Add blank slide** | Add a new slide with a blank/uploaded/library background |

### Editor Layout (rough)
```
┌─────────────────────────────────────────────────────┐
│  [Quick Generate]  [Editor Mode]                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │              │  │   Text Properties Panel       │ │
│  │              │  │   ─────────────────────────   │ │
│  │   Canvas     │  │   Font size: [14px]           │ │
│  │   1080x1350  │  │   Weight: [Bold ▼]            │ │
│  │   (scaled)   │  │   Color: [■ #FFF]             │ │
│  │              │  │   Align: [L] [C] [R]          │ │
│  │              │  │   Border: [✓] [■ #000] [2px]  │ │
│  │              │  ├──────────────────────────────┤ │
│  └──────────────┘  │   Background                  │ │
│                     │   [Regenerate] [Upload] [Lib] │ │
│  ┌──────────────────│   [Apply to All]              │ │
│  │ [1] [2] [3] [+]  │   Prompt: [editable...]       │ │
│  │ Slide filmstrip   └──────────────────────────────┘ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  [Extract Text]  [Generate Backgrounds]  [Download]  │
└─────────────────────────────────────────────────────┘
```

---

## 6. Background Library

### Storage
- **Supabase bucket:** `backgrounds` (new bucket)
- **Database table:** `background_library` (new table)

### Schema: `background_library`
```sql
CREATE TABLE background_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('generated', 'uploaded')),
  prompt TEXT,                    -- The prompt used to generate (null for uploads)
  source_video_id UUID REFERENCES videos(id),  -- Optional: which video it originated from
  width INT,
  height INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Behavior
- Global library, not scoped to any specific carousel/video
- Generated backgrounds auto-saved on creation and on replacement
- Uploaded backgrounds saved to library on upload
- Library browsable from editor's background panel (grid of thumbnails)
- Can be filtered/sorted by recency
- Library images can be deleted

---

## 7. API Routes (New / Modified)

### `POST /api/editor/extract-text`
Extract text from slide images using GPT-5.1.
```typescript
// Request
{ videoId: string; slideIndexes: number[] }

// Response
{ slides: ExtractedSlide[] }
```
- Sends one GPT-5.1 call per slide (parallel with rate limiting)
- Returns structured JSON per the schema in Section 3

### `POST /api/editor/generate-background`
Generate a text-free background for a single slide.
```typescript
// Request
{ videoId: string; slideIndex: number; prompt?: string }

// Response
{ imageUrl: string; libraryId: string }
```
- Uses the original slide as input image
- Default prompt if not provided
- Auto-saves result to `background_library` and `backgrounds` bucket
- Returns the Supabase storage URL

### `POST /api/editor/generate-background/batch`
Generate backgrounds for multiple slides at once.
```typescript
// Request
{ videoId: string; slideIndexes: number[]; prompt?: string }

// Response
{ backgrounds: { slideIndex: number; imageUrl: string; libraryId: string }[] }
```

### `POST /api/editor/export`
Flatten text onto backgrounds and export as ZIP.
```typescript
// Request
{
  slides: {
    backgroundUrl: string;
    textBlocks: {
      text: string;
      x: number; y: number;
      width: number; height: number;
      fontSize: number;
      fontWeight: string;
      color: string;
      alignment: string;
      hasBorder: boolean;
      borderColor?: string;
      borderThickness?: number;
    }[];
  }[];
  outputFormat: "png" | "jpeg" | "webp";
}

// Response
ZIP file (Content-Type: application/zip)
```
- Server-side compositing using `sharp` + `@napi-rs/canvas` (or sharp's composite API with SVG text overlay)
- Resize to 1080x1350
- Strip metadata (same pipeline as current)

### `GET /api/backgrounds`
List backgrounds from the global library.
```typescript
// Query params: page, limit, sort (newest|oldest)

// Response
{ backgrounds: BackgroundLibraryItem[]; total: number; hasMore: boolean }
```

### `POST /api/backgrounds`
Upload a custom background image.
```typescript
// Request: FormData with image file

// Response
{ id: string; imageUrl: string }
```

### `DELETE /api/backgrounds/[id]`
Delete a background from the library.

---

## 8. Database Changes

### New Table: `background_library`
See schema in Section 6.

### New Bucket: `backgrounds`
- Public read, authenticated write
- Stores all background images (generated and uploaded)

### No changes to existing tables
The editor mode creates no `generation_sets` or `generated_images` records. It operates independently — the only shared resource is the `videos` table for original slides.

---

## 9. Export / Download Pipeline

```
For each slide:
  1. Download background image from URL
  2. Render text blocks onto background:
     - Use sharp composite with SVG text overlay, OR
     - Use @napi-rs/canvas to draw text with proper font, position, color, border
  3. Resize to 1080 x 1350
  4. Strip metadata (EXIF, XMP, C2PA, Synth ID)
  5. Encode as outputFormat (png/jpeg/webp)

Bundle all slides into ZIP → stream to client
```

### Font Rendering on Server
- Need TikTok Sans font files registered with the server-side canvas library
- `@napi-rs/canvas` supports `registerFont()` for custom fonts
- Fallback to DM Sans if TikTok Sans unavailable

---

## 10. Client-Side State

### Editor State (React Context or Zustand)
```typescript
interface EditorState {
  videoId: string;
  originalSlides: string[];          // Original image URLs from video

  slides: EditorSlide[];             // Current working slides
  activeSlideIndex: number;
  selectedBlockId: string | null;

  // Extraction state
  extractionStatus: "idle" | "loading" | "done" | "error";

  // Background generation state per slide
  bgGenerationStatus: Record<number, "idle" | "loading" | "done" | "error">;

  // Actions
  extractText: () => Promise<void>;
  generateBackground: (slideIndex: number, prompt?: string) => Promise<void>;
  generateAllBackgrounds: (prompt?: string) => Promise<void>;
  applyBackgroundToAll: (imageUrl: string) => void;
  updateTextBlock: (slideIndex: number, blockId: string, updates: Partial<TextBlock>) => void;
  addTextBlock: (slideIndex: number) => void;
  deleteTextBlock: (slideIndex: number, blockId: string) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  removeSlide: (slideIndex: number) => void;
  addBlankSlide: () => void;
  exportZip: () => Promise<void>;
}

interface EditorSlide {
  id: string;
  originalImageUrl: string | null;   // null for added blank slides
  backgroundUrl: string | null;      // Generated/uploaded/library BG
  bgPrompt: string;                  // Editable prompt for this slide's BG
  textBlocks: TextBlock[];
}

interface TextBlock {
  id: string;
  text: string;
  x: number;                         // % of canvas width
  y: number;                         // % of canvas height
  width: number;
  height: number;
  fontSize: number;
  fontWeight: "regular" | "medium" | "bold" | "extra-bold";
  color: string;
  alignment: "left" | "center" | "right";
  hasBorder: boolean;
  borderColor: string;
  borderThickness: number;           // 1=thin, 2=medium, 3=thick
}
```

---

## 11. Component Hierarchy

```
GeneratePage
├── TabSelector ("Quick Generate" | "Editor Mode")
├── [if Quick Generate] → existing GenerateForm + OutputDisplay
└── [if Editor Mode] → CarouselEditor
    ├── EditorToolbar
    │   ├── ExtractTextButton
    │   ├── GenerateBackgroundsButton
    │   └── DownloadButton
    ├── EditorCanvas (react-konva Stage)
    │   ├── BackgroundLayer (Konva.Image)
    │   └── TextBlockLayer (Konva.Text per block, draggable)
    ├── SlideFilmstrip
    │   ├── SlideThumbnail[] (draggable for reorder)
    │   ├── RemoveSlideButton
    │   └── AddSlideButton
    └── PropertiesPanel
        ├── TextProperties (shown when a text block is selected)
        │   ├── FontSizeInput
        │   ├── FontWeightSelect
        │   ├── ColorPicker
        │   ├── AlignmentToggle
        │   ├── BorderToggle + BorderColorPicker + ThicknessSelect
        │   └── DeleteBlockButton
        ├── BackgroundControls
        │   ├── RegenerateButton + PromptInput
        │   ├── UploadButton
        │   ├── LibraryBrowser
        │   └── ApplyToAllButton
        └── BulkActions
            ├── ResetAllColorsButton
            └── ApplyColorToAllButton
```

---

## 12. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Canvas library | Konva.js (react-konva) | Best React integration, built-in drag, good text support, straightforward export |
| Text extraction model | GPT-5.1 (vision) | Best accuracy for structured extraction with position data |
| Extraction strategy | 1 call per slide | More reliable than batching for position/style accuracy |
| Background model | gpt-image-1 (edit mode) | Same model as current gen, proven quality |
| BG prompt | Auto-generated + user editable | Flexibility without requiring user effort |
| Server-side compositing | `@napi-rs/canvas` | Proper font rendering with `registerFont()`, better text accuracy than sharp SVG overlay |
| Background library | Global (not per-video) | Maximum reusability |
| State management | Zustand or React Context | Lightweight, sufficient for single-page editor state |
| Font | TikTok Sans (self-hosted, need to source) | Authentic look; fallback to DM Sans |

---

## 13. Out of Scope (for v1)

- Undo/redo history in the editor
- Collaborative editing
- Template saving (save a carousel layout for reuse)
- Animation/transition preview
- Direct TikTok publishing from editor
- Image filters/effects on backgrounds
- Custom font uploads (beyond TikTok Sans)

---

## 14. Open Questions

1. **TikTok Sans font files** — Where to source them? May need to extract from TikTok's web assets or find an open-source equivalent.
2. **GPT-5.1 availability** — Is the model available now? If not, what's the fallback for text extraction? (GPT-4o vision?)
3. **Server-side text rendering fidelity** — Will `@napi-rs/canvas` render text identically to Konva.js on the client? May need a pixel-comparison test during development.
4. **Rate limits** — GPT-5.1 vision rate limits for text extraction + gpt-image-1 for backgrounds. May need separate rate limiters.
