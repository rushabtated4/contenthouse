"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Type, Wand2, Loader2, ImagePlus } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { EditorFilmstrip } from "./editor-filmstrip";
import { EditorToolbar } from "./editor-toolbar";
import { TextPropertiesPanel } from "./text-properties-panel";
import { BackgroundControls } from "./background-controls";
import { OverlayControls } from "./overlay-controls";
import { ZOrderControls } from "./z-order-controls";
import { ClearSlidesDialog } from "./clear-slides-dialog";
import { CanvasBackgroundUpload } from "./canvas-bg-upload";
import { ExtractTextModal } from "./extract-text-modal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Video, GenerationSetWithImages } from "@/types/database";

const EditorCanvas = dynamic(() => import("./editor-canvas").then((m) => m.EditorCanvas), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[4/5] bg-muted rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-muted-foreground text-sm">Loading canvas...</span>
    </div>
  ),
});

interface CarouselEditorProps {
  video: Video & { generation_sets?: GenerationSetWithImages[] };
  editorSetId?: string | null;
}

export function CarouselEditor({ video, editorSetId }: CarouselEditorProps) {
  const initFromVideo = useEditorStore((s) => s.initFromVideo);
  const initFromGeneratedSet = useEditorStore((s) => s.initFromGeneratedSet);
  const slides = useEditorStore((s) => s.slides);
  const originalSlides = useEditorStore((s) => s.originalSlides);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const extractTextForSlide = useEditorStore((s) => s.extractTextForSlide);
  const generateBackground = useEditorStore((s) => s.generateBackground);
  const setBackgroundFromUpload = useEditorStore((s) => s.setBackgroundFromUpload);
  const updateBgPrompt = useEditorStore((s) => s.updateBgPrompt);
  const bgGenerationStatus = useEditorStore((s) => s.bgGenerationStatus);
  const extractionStatus = useEditorStore((s) => s.extractionStatus);

  const activeSlide = slides[activeSlideIndex];

  // Check if exactly one text block is selected
  const selectedTextBlock = selectedIds.length === 1 && activeSlide
    ? activeSlide.textBlocks.find((b) => b.id === selectedIds[0])
    : null;

  useEffect(() => {
    if (!video.id || !video.original_images?.length) return;

    if (editorSetId) {
      const targetSet = video.generation_sets?.find((s) => s.id === editorSetId);
      if (targetSet) {
        initFromGeneratedSet(video.id, editorSetId, targetSet.generated_images, video.original_images);
        return;
      }
    }

    initFromVideo(video.id, video.original_images);
  }, [video.id, editorSetId]);

  if (!slides.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No slides available for editing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EditorToolbar />

      {/* Reference slides strip */}
      {originalSlides.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Reference Slides</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {originalSlides.map((url, i) => (
              <ReferenceSlide
                key={i}
                url={url}
                index={i}
                bgPrompt={slides[i]?.bgPrompt ?? ""}
                bgLoading={bgGenerationStatus[i] === "loading"}
                extracting={extractionStatus === "loading"}
                onExtractText={() => extractTextForSlide(i)}
                onUseOriginal={() => setBackgroundFromUpload(i, originalSlides[i])}
                onGenerateBackground={() => generateBackground(i)}
                onUpdateBgPrompt={(prompt) => updateBgPrompt(i, prompt)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <EditorFilmstrip />
          <EditorCanvas />
          <CanvasBackgroundUpload />
          <div className="flex justify-end">
            <ClearSlidesDialog />
          </div>
        </div>
        <div className="space-y-4">
          {selectedTextBlock && <TextPropertiesPanel />}
          <ZOrderControls />
          <OverlayControls />
          <BackgroundControls />
        </div>
      </div>

      <ExtractTextModal />
    </div>
  );
}

function ReferenceSlide({
  url,
  index,
  bgPrompt,
  bgLoading,
  extracting,
  onExtractText,
  onUseOriginal,
  onGenerateBackground,
  onUpdateBgPrompt,
}: {
  url: string;
  index: number;
  bgPrompt: string;
  bgLoading: boolean;
  extracting: boolean;
  onExtractText: () => void;
  onUseOriginal: () => void;
  onGenerateBackground: () => void;
  onUpdateBgPrompt: (prompt: string) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [localPrompt, setLocalPrompt] = useState(bgPrompt);

  useEffect(() => {
    setLocalPrompt(bgPrompt);
  }, [bgPrompt]);

  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      <div className="relative w-[72px] h-[90px] rounded-md overflow-hidden border border-dashed border-muted-foreground/30">
        <img
          src={url}
          alt={`Reference ${index + 1}`}
          className="w-full h-full object-cover opacity-80"
        />
        <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] rounded px-1">
          {index + 1}
        </span>
        {bgLoading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          </div>
        )}
      </div>
      <div className="flex gap-0.5">
        <button
          onClick={onExtractText}
          disabled={extracting}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Extract text from this slide"
        >
          {extracting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Type className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          onClick={onUseOriginal}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Use original as background"
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </button>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={bgLoading}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Generate background from this slide"
            >
              {bgLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" side="bottom" align="start">
            <div className="space-y-2">
              <p className="text-xs font-medium">Background prompt</p>
              <Textarea
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                rows={3}
                className="text-xs resize-none"
                placeholder="Describe the background..."
              />
              <Button
                size="sm"
                className="w-full"
                disabled={bgLoading}
                onClick={() => {
                  onUpdateBgPrompt(localPrompt);
                  onGenerateBackground();
                  setPopoverOpen(false);
                }}
              >
                {bgLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
