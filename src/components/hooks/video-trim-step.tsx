"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "./video-player";
import { TrimRangeSlider } from "./trim-range-slider";

interface VideoTrimStepProps {
  videoUrl: string;
  initialTrimStart?: number;
  initialTrimEnd?: number;
  onTrimConfirm: (trimStart: number, trimEnd: number, duration: number) => void;
}

export function VideoTrimStep({
  videoUrl,
  initialTrimStart = 0,
  initialTrimEnd,
  onTrimConfirm,
}: VideoTrimStepProps) {
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(initialTrimStart);
  const [trimEnd, setTrimEnd] = useState(initialTrimEnd || 0);

  const handleLoadedMetadata = useCallback((dur: number) => {
    setDuration(dur);
    if (!initialTrimEnd) {
      setTrimEnd(Math.min(dur, 30));
    }
  }, [initialTrimEnd]);

  const handleRangeChange = useCallback((start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  const clipDuration = trimEnd - trimStart;
  const isValid = clipDuration >= 3 && clipDuration <= 30;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 2: Trim Video</h2>
        <p className="text-sm text-muted-foreground">
          Select a 3-30 second clip for the motion reference.
        </p>
      </div>

      <VideoPlayer
        src={videoUrl}
        trimStart={trimStart}
        trimEnd={trimEnd}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {duration > 0 && (
        <TrimRangeSlider
          duration={duration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          onChange={handleRangeChange}
        />
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => onTrimConfirm(trimStart, trimEnd, duration)}
          disabled={!isValid}
        >
          Confirm Trim ({clipDuration.toFixed(1)}s)
        </Button>
      </div>
    </div>
  );
}
