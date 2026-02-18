"use client";

import { SlideCard } from "./slide-card";

interface SlideGridProps {
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

export function SlideGrid({
  images,
  selectedSlides,
  perSlidePrompts,
  perSlideOverlays,
  onToggleSlide,
  onPromptChange,
  onOverlayUpload,
  onOverlaySelect,
  onOverlayRemove,
}: SlideGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
      {images.map((url, i) => (
        <SlideCard
          key={i}
          index={i}
          imageUrl={url}
          isSelected={selectedSlides.has(i)}
          prompt={perSlidePrompts[i] || ""}
          overlayUrl={perSlideOverlays[i] || null}
          onToggle={() => onToggleSlide(i)}
          onPromptChange={(p) => onPromptChange(i, p)}
          onOverlayUpload={(f) => onOverlayUpload(i, f)}
          onOverlaySelect={(url) => onOverlaySelect(i, url)}
          onOverlayRemove={() => onOverlayRemove(i)}
        />
      ))}
    </div>
  );
}
