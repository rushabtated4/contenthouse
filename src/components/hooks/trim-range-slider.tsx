"use client";

import { useCallback, useRef, useState, useEffect } from "react";

interface TrimRangeSliderProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  minRange?: number;
  maxRange?: number;
  onChange: (start: number, end: number) => void;
}

export function TrimRangeSlider({
  duration,
  trimStart,
  trimEnd,
  minRange = 3,
  maxRange = 30,
  onChange,
}: TrimRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  const getPositionFromMouse = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pct * duration;
    },
    [duration]
  );

  const handleMouseDown = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(handle);
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getPositionFromMouse(e.clientX);
      if (dragging === "start") {
        const newStart = Math.max(0, Math.min(pos, trimEnd - minRange));
        const clampedStart = trimEnd - newStart > maxRange ? trimEnd - maxRange : newStart;
        onChange(Math.round(clampedStart * 10) / 10, trimEnd);
      } else {
        const newEnd = Math.min(duration, Math.max(pos, trimStart + minRange));
        const clampedEnd = newEnd - trimStart > maxRange ? trimStart + maxRange : newEnd;
        onChange(trimStart, Math.round(clampedEnd * 10) / 10);
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, duration, trimStart, trimEnd, minRange, maxRange, onChange, getPositionFromMouse]);

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const clipDuration = trimEnd - trimStart;

  return (
    <div className="space-y-2">
      <div ref={trackRef} className="relative h-8 bg-muted rounded cursor-pointer select-none">
        {/* Inactive regions */}
        <div className="absolute inset-y-0 left-0 bg-muted-foreground/20 rounded-l" style={{ width: `${startPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-muted-foreground/20 rounded-r" style={{ width: `${100 - endPct}%` }} />

        {/* Active region */}
        <div
          className="absolute inset-y-0 bg-primary/20 border-y-2 border-primary"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />

        {/* Start handle */}
        <div
          onMouseDown={handleMouseDown("start")}
          className="absolute top-0 bottom-0 w-3 bg-primary rounded-l cursor-ew-resize hover:bg-primary/80 z-10"
          style={{ left: `calc(${startPct}% - 6px)` }}
        />

        {/* End handle */}
        <div
          onMouseDown={handleMouseDown("end")}
          className="absolute top-0 bottom-0 w-3 bg-primary rounded-r cursor-ew-resize hover:bg-primary/80 z-10"
          style={{ left: `calc(${endPct}% - 6px)` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{trimStart.toFixed(1)}s</span>
        <span className="font-medium text-foreground">{clipDuration.toFixed(1)}s clip</span>
        <span>{trimEnd.toFixed(1)}s</span>
      </div>
    </div>
  );
}
