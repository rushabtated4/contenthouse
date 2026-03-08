"use client";

import { useRef, useCallback } from "react";
import { TimelineTrack } from "./timeline-track";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import type { VideoTextOverlay } from "@/types/hook-editor";

interface EditorTimelineProps {
  duration: number;
  playheadTime: number;
  isPlaying: boolean;
  textOverlays: VideoTextOverlay[];
  selectedOverlayId: string | null;
  onPlayheadChange: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSelectOverlay: (id: string | null) => void;
  onUpdateOverlay: (id: string, updates: Partial<VideoTextOverlay>) => void;
}

const TRACK_COLORS = ["#3b82f6", "#ef4444", "#22c55e"];

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

export function EditorTimeline({
  duration,
  playheadTime,
  isPlaying,
  textOverlays,
  selectedOverlayId,
  onPlayheadChange,
  onPlayingChange,
  onSelectOverlay,
  onUpdateOverlay,
}: EditorTimelineProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleBarClick = useCallback((e: React.MouseEvent) => {
    const bar = barRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onPlayheadChange(pct * duration);
  }, [duration, onPlayheadChange]);

  const handleBarDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar || duration <= 0) return;
    const rect = bar.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      const pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      onPlayheadChange(pct * duration);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [duration, onPlayheadChange]);

  const playheadPct = duration > 0 ? (playheadTime / duration) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-7 p-0"
          onClick={() => onPlayingChange(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </Button>
        <span className="text-xs font-mono text-muted-foreground">
          {formatTime(playheadTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Main timeline bar */}
      <div
        ref={barRef}
        className="relative h-6 bg-muted rounded cursor-pointer"
        onClick={handleBarClick}
        onMouseDown={handleBarDrag}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-primary" />
        </div>
      </div>

      {/* Overlay tracks */}
      {textOverlays.map((overlay, idx) => (
        <TimelineTrack
          key={overlay.id}
          overlay={overlay}
          duration={duration}
          color={TRACK_COLORS[idx % TRACK_COLORS.length]}
          isSelected={overlay.id === selectedOverlayId}
          onSelect={() => onSelectOverlay(overlay.id)}
          onUpdateTiming={(start, end) => onUpdateOverlay(overlay.id, { startTime: start, endTime: end })}
        />
      ))}

      {textOverlays.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          Add text overlays to see timeline tracks
        </p>
      )}
    </div>
  );
}
