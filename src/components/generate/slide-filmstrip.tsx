"use client";

import { SlideGrid } from "./slide-grid";

interface SlideFilmstripProps {
  images: string[];
  selectedSlides: Set<number>;
  perSlidePrompts: Record<number, string>;
  perSlideOverlays: Record<number, string | null>;
  onToggleSlide: (index: number) => void;
  onPromptChange: (index: number, prompt: string) => void;
  onOverlayUpload: (index: number, file: File) => void;
  onOverlaySelect: (index: number, url: string) => void;
  onOverlayRemove: (index: number) => void;
}

export function SlideFilmstrip({
  images,
  selectedSlides,
  perSlidePrompts,
  perSlideOverlays,
  onToggleSlide,
  onPromptChange,
  onOverlayUpload,
  onOverlaySelect,
  onOverlayRemove,
}: SlideFilmstripProps) {
  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">
        Source Slides ({images.length})
      </h3>

      <SlideGrid
        images={images}
        selectedSlides={selectedSlides}
        perSlidePrompts={perSlidePrompts}
        perSlideOverlays={perSlideOverlays}
        onToggleSlide={onToggleSlide}
        onPromptChange={onPromptChange}
        onOverlayUpload={onOverlayUpload}
        onOverlaySelect={onOverlaySelect}
        onOverlayRemove={onOverlayRemove}
      />
    </div>
  );
}
