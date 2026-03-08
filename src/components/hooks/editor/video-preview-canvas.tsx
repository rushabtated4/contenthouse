"use client";

import { useRef, useEffect, useCallback } from "react";
import { VideoTextOverlayBlock } from "./video-text-overlay-block";
import type { VideoTextOverlay } from "@/types/hook-editor";

interface VideoPreviewCanvasProps {
  videoUrl: string;
  textOverlays: VideoTextOverlay[];
  playheadTime: number;
  isPlaying: boolean;
  selectedOverlayId: string | null;
  onDurationLoaded: (duration: number) => void;
  onPlayheadChange: (time: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSelectOverlay: (id: string | null) => void;
  onUpdateOverlay: (id: string, updates: Partial<VideoTextOverlay>) => void;
}

export function VideoPreviewCanvas({
  videoUrl,
  textOverlays,
  playheadTime,
  isPlaying,
  selectedOverlayId,
  onDurationLoaded,
  onPlayheadChange,
  onPlayingChange,
  onSelectOverlay,
  onUpdateOverlay,
}: VideoPreviewCanvasProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  // Sync video playback with playhead
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => onPlayingChange(false));

      const tick = () => {
        onPlayheadChange(video.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);

      return () => cancelAnimationFrame(rafRef.current);
    } else {
      video.pause();
    }
  }, [isPlaying, onPlayheadChange, onPlayingChange]);

  // Seek when playhead changes externally (not during playback)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isPlaying) return;
    if (Math.abs(video.currentTime - playheadTime) > 0.1) {
      video.currentTime = playheadTime;
    }
  }, [playheadTime, isPlaying]);

  const handleVideoClick = useCallback(() => {
    onPlayingChange(!isPlaying);
  }, [isPlaying, onPlayingChange]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === videoRef.current) {
      onSelectOverlay(null);
    }
  }, [onSelectOverlay]);

  const visibleOverlays = textOverlays.filter(
    (o) => playheadTime >= o.startTime && playheadTime <= o.endTime
  );

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden mx-auto"
      style={{ aspectRatio: "9/16", maxHeight: "70vh" }}
      onClick={handleContainerClick}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain cursor-pointer"
        preload="auto"
        playsInline
        onClick={handleVideoClick}
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          onDurationLoaded(video.duration);
        }}
        onEnded={() => onPlayingChange(false)}
      />

      {/* Text overlays */}
      {visibleOverlays.map((overlay) => (
        <VideoTextOverlayBlock
          key={overlay.id}
          overlay={overlay}
          isSelected={overlay.id === selectedOverlayId}
          containerRef={containerRef}
          onSelect={() => onSelectOverlay(overlay.id)}
          onUpdate={(updates) => onUpdateOverlay(overlay.id, updates)}
        />
      ))}
    </div>
  );
}
