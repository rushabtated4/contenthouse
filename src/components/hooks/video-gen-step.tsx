"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KlingConfig } from "./kling-config";
import { VideoGenProgress } from "./video-gen-progress";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import type { HookGeneratedVideoWithImage } from "@/types/hooks";

interface VideoGenStepProps {
  sessionId: string;
  existingVideos: HookGeneratedVideoWithImage[];
  onVideosStarted: () => void;
}

export function VideoGenStep({ sessionId, existingVideos, onVideosStarted }: VideoGenStepProps) {
  const [characterOrientation, setCharacterOrientation] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [videos, setVideos] = useState<HookGeneratedVideoWithImage[]>(existingVideos);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/generate-videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterOrientation, prompt, keepOriginalSound }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start video generation");
      }

      const data = await res.json();
      setVideos(data.videos);
      toast.success("Video generation started! This may take 1-5 minutes.");
      onVideosStarted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate videos");
    } finally {
      setGenerating(false);
    }
  };

  const hasActiveGenerations = videos.some((v) => v.status === "generating" || v.status === "pending");
  const allFailed = videos.length > 0 && videos.every((v) => v.status === "failed");
  const showConfig = videos.length === 0 || allFailed;

  const handleRetry = () => {
    setVideos([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 6: Generate Videos</h2>
        <p className="text-sm text-muted-foreground">
          Animate your selected images using Kling v2.6 Motion Control.
        </p>
      </div>

      {/* Show failed results before retry form */}
      {allFailed && videos.length > 0 && (
        <>
          <VideoGenProgress videos={videos} />
          <Button variant="outline" onClick={handleRetry} className="w-full">
            Try Again
          </Button>
        </>
      )}

      {showConfig && !allFailed && (
        <>
          <KlingConfig
            characterOrientation={characterOrientation}
            prompt={prompt}
            keepOriginalSound={keepOriginalSound}
            onOrientationChange={setCharacterOrientation}
            onPromptChange={setPrompt}
            onSoundChange={setKeepOriginalSound}
            disabled={generating}
          />

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-1" />
                Generate Videos
              </>
            )}
          </Button>
        </>
      )}

      {videos.length > 0 && !allFailed && (
        <>
          <VideoGenProgress videos={videos} />
          {hasActiveGenerations && (
            <p className="text-sm text-muted-foreground text-center">
              Videos are generating. This page auto-refreshes every 5 seconds.
            </p>
          )}
        </>
      )}
    </div>
  );
}
