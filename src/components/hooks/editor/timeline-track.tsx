"use client";

import { useRef, useCallback } from "react";
import type { VideoTextOverlay } from "@/types/hook-editor";

interface TimelineTrackProps {
  overlay: VideoTextOverlay;
  duration: number;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateTiming: (start: number, end: number) => void;
}

export function TimelineTrack({
  overlay,
  duration,
  color,
  isSelected,
  onSelect,
  onUpdateTiming,
}: TimelineTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const startPct = duration > 0 ? (overlay.startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (overlay.endTime / duration) * 100 : 0;
  const widthPct = endPct - startPct;

  const handleDragHandle = useCallback((e: React.MouseEvent, handle: "start" | "end") => {
    e.stopPropagation();
    onSelect();
    const track = trackRef.current;
    if (!track || duration <= 0) return;
    const rect = track.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const time = pct * duration;

      if (handle === "start") {
        onUpdateTiming(Math.min(time, overlay.endTime - 0.1), overlay.endTime);
      } else {
        onUpdateTiming(overlay.startTime, Math.max(time, overlay.startTime + 0.1));
      }
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [duration, overlay.startTime, overlay.endTime, onSelect, onUpdateTiming]);

  const handleBarDrag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const track = trackRef.current;
    if (!track || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const initialPct = (e.clientX - rect.left) / rect.width;
    const barDuration = overlay.endTime - overlay.startTime;

    const onMove = (ev: MouseEvent) => {
      const currentPct = (ev.clientX - rect.left) / rect.width;
      const delta = (currentPct - initialPct) * duration;
      let newStart = overlay.startTime + delta;
      let newEnd = overlay.endTime + delta;

      if (newStart < 0) { newStart = 0; newEnd = barDuration; }
      if (newEnd > duration) { newEnd = duration; newStart = duration - barDuration; }

      onUpdateTiming(newStart, newEnd);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [duration, overlay.startTime, overlay.endTime, onSelect, onUpdateTiming]);

  return (
    <div
      ref={trackRef}
      className={`relative h-5 rounded cursor-pointer ${isSelected ? "ring-1 ring-primary" : ""}`}
      style={{ backgroundColor: `${color}20` }}
      onClick={onSelect}
    >
      {/* Bar */}
      <div
        className="absolute top-0 bottom-0 rounded flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          left: `${startPct}%`,
          width: `${widthPct}%`,
          backgroundColor: `${color}80`,
        }}
        onMouseDown={handleBarDrag}
      >
        <span className="text-[9px] text-white font-medium truncate px-1">
          {overlay.text.slice(0, 15)}
        </span>
      </div>

      {/* Start handle */}
      <div
        className="absolute top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/30 rounded-l"
        style={{ left: `${startPct}%` }}
        onMouseDown={(e) => handleDragHandle(e, "start")}
      />

      {/* End handle */}
      <div
        className="absolute top-0 bottom-0 w-2 cursor-col-resize z-10 hover:bg-white/30 rounded-r"
        style={{ left: `calc(${endPct}% - 8px)` }}
        onMouseDown={(e) => handleDragHandle(e, "end")}
      />
    </div>
  );
}
