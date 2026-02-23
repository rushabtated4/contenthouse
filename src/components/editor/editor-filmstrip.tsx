"use client";

import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useRef, useState } from "react";

export function EditorFilmstrip() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const setActiveSlide = useEditorStore((s) => s.setActiveSlide);
  const removeSlide = useEditorStore((s) => s.removeSlide);
  const addBlankSlide = useEditorStore((s) => s.addBlankSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  }, []);

  const handleDrop = useCallback(() => {
    if (dragIndex !== null && dragOverIndex.current !== null && dragIndex !== dragOverIndex.current) {
      reorderSlides(dragIndex, dragOverIndex.current);
    }
    setDragIndex(null);
    dragOverIndex.current = null;
  }, [dragIndex, reorderSlides]);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={handleDrop}
          onClick={() => setActiveSlide(i)}
          className={cn(
            "relative shrink-0 w-[72px] h-[90px] rounded-md overflow-hidden border-2 cursor-pointer transition-all group",
            i === activeSlideIndex ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
            dragIndex === i && "opacity-50"
          )}
        >
          {(slide.backgroundUrl || slide.originalImageUrl) ? (
            <img
              src={slide.backgroundUrl || slide.originalImageUrl}
              alt={`Slide ${i + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
              {i + 1}
            </div>
          )}

          {/* Slide number badge */}
          <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] rounded px-1">
            {i + 1}
          </span>

          {/* Remove button */}
          {slides.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeSlide(i);
              }}
              className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addBlankSlide}
        className="shrink-0 w-[72px] h-[90px] flex flex-col items-center justify-center gap-1"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[10px]">Add</span>
      </Button>
    </div>
  );
}
