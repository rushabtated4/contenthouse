"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw } from "lucide-react";

interface SnapshotCaptureProps {
  videoUrl: string;
  trimStart: number;
  trimEnd: number;
  onCapture: (imageData: string, timestamp: number) => void;
}

export function SnapshotCapture({ videoUrl, trimStart, trimEnd, onCapture }: SnapshotCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(trimStart);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL("image/png");
    setPreview(imageData);
    onCapture(imageData, video.currentTime);
  }, [onCapture]);

  const handleReset = useCallback(() => {
    setPreview(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="relative">
        {!preview ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full max-h-[400px] rounded-lg bg-black"
            crossOrigin="anonymous"
            onLoadedMetadata={() => {
              if (videoRef.current) videoRef.current.currentTime = trimStart;
            }}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                if (videoRef.current.currentTime > trimEnd) {
                  videoRef.current.currentTime = trimStart;
                }
              }
            }}
          />
        ) : (
          <img src={preview} alt="Captured snapshot" className="w-full max-h-[400px] rounded-lg object-contain bg-black" />
        )}
      </div>

      {!preview && (
        <div className="space-y-2">
          <input
            type="range"
            min={trimStart}
            max={trimEnd}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const time = parseFloat(e.target.value);
              setCurrentTime(time);
              if (videoRef.current) videoRef.current.currentTime = time;
            }}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground text-center">
            Scrub to find the perfect frame ({currentTime.toFixed(1)}s)
          </p>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-2 justify-end">
        {preview && (
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retake
          </Button>
        )}
        {!preview && (
          <Button onClick={handleCapture}>
            <Camera className="w-4 h-4 mr-1" />
            Capture Frame
          </Button>
        )}
      </div>
    </div>
  );
}
