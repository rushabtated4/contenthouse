"use client";

import { useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";

export function CanvasBackgroundUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const setBackgroundFromUpload = useEditorStore((s) => s.setBackgroundFromUpload);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setBackgroundFromUpload(activeSlideIndex, url);
    },
    [activeSlideIndex, setBackgroundFromUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed cursor-pointer transition-colors ${
        dragging
          ? "border-primary bg-primary/5 text-primary"
          : "border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
      }`}
    >
      <Upload className="h-3.5 w-3.5" />
      <span className="text-xs">Upload background</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
