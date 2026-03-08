"use client";

import { useRef, useCallback, useState } from "react";
import type { VideoTextOverlay } from "@/types/hook-editor";

interface VideoTextOverlayBlockProps {
  overlay: VideoTextOverlay;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (updates: Partial<VideoTextOverlay>) => void;
}

export function VideoTextOverlayBlock({
  overlay,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
}: VideoTextOverlayBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: overlay.x,
      oy: overlay.y,
    };
    setDragging(true);

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100 - overlay.width, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(100 - overlay.height, dragStart.current.oy + dy));
      onUpdate({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragStart.current = null;
      setDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [overlay.x, overlay.y, overlay.width, overlay.height, containerRef, onSelect, onUpdate]);

  const displayText = overlay.textTransform === "uppercase"
    ? overlay.text.toUpperCase()
    : overlay.textTransform === "lowercase"
    ? overlay.text.toLowerCase()
    : overlay.text;

  // Scale fontSize relative to container (1080px canvas base)
  const containerWidth = containerRef.current?.clientWidth || 400;
  const scaledFontSize = (overlay.fontSize * containerWidth) / 1080;

  const fontWeightMap: Record<number, string> = {
    400: "normal",
    500: "500",
    600: "600",
    700: "bold",
    800: "800",
  };

  return (
    <div
      ref={blockRef}
      className={`absolute select-none ${dragging ? "cursor-grabbing" : "cursor-grab"} ${
        isSelected ? "ring-2 ring-primary ring-offset-1" : ""
      }`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: `${overlay.width}%`,
        minHeight: `${overlay.height}%`,
        zIndex: overlay.zIndex + 10,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div
        style={{
          fontSize: `${scaledFontSize}px`,
          fontWeight: fontWeightMap[overlay.fontWeight] || "bold",
          color: overlay.color,
          textAlign: overlay.alignment,
          lineHeight: overlay.lineHeight,
          letterSpacing: `${(overlay.letterSpacing * containerWidth) / 1080}px`,
          wordSpacing: `${(overlay.wordSpacing * containerWidth) / 1080}px`,
          textShadow: overlay.hasShadow
            ? `${overlay.shadowOffsetX}px ${overlay.shadowOffsetY}px ${overlay.shadowBlur}px ${overlay.shadowColor}`
            : "none",
          WebkitTextStroke: overlay.hasStroke
            ? `${overlay.strokeWidth}px ${overlay.strokeColor}`
            : "none",
          backgroundColor: overlay.backgroundOpacity > 0
            ? `${overlay.backgroundColor}${Math.round(overlay.backgroundOpacity * 255).toString(16).padStart(2, "0")}`
            : "transparent",
          padding: overlay.backgroundOpacity > 0 ? `${(overlay.backgroundPadding * containerWidth) / 1080}px` : 0,
          borderRadius: overlay.backgroundOpacity > 0 ? `${(overlay.backgroundCornerRadius * containerWidth) / 1080}px` : 0,
          borderWidth: overlay.backgroundBorderWidth > 0 ? `${overlay.backgroundBorderWidth}px` : 0,
          borderColor: overlay.backgroundBorderColor,
          borderStyle: overlay.backgroundBorderWidth > 0 ? "solid" : "none",
        }}
      >
        {displayText}
      </div>
    </div>
  );
}
