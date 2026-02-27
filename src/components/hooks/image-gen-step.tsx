"use client";

import { useState } from "react";
import { ImageGenConfig } from "./image-gen-config";
import { ImageGenResults } from "./image-gen-results";
import { toast } from "sonner";
import type { HookGeneratedImage } from "@/types/hooks";

interface ImageGenStepProps {
  sessionId: string;
  existingImages: HookGeneratedImage[];
  onImagesReady: () => void;
}

export function ImageGenStep({ sessionId, existingImages, onImagesReady }: ImageGenStepProps) {
  const [prompt, setPrompt] = useState("");
  const [numImages, setNumImages] = useState(4);
  const [aspectRatio, setAspectRatio] = useState("2:3");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<HookGeneratedImage[]>(existingImages);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, numImages, aspectRatio }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setImages(data.images);
      toast.success("Images generated!");
      onImagesReady();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = async (imageId: string) => {
    setRetryingId(imageId);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/generate-images/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (!res.ok) throw new Error("Retry failed");

      const updated = await res.json();
      setImages((prev) => prev.map((img) => (img.id === imageId ? updated : img)));
      toast.success("Image regenerated");
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 4: Generate Images</h2>
        <p className="text-sm text-muted-foreground">
          Describe how the AI should transform your snapshot using Nano Banana Pro.
        </p>
      </div>

      <ImageGenConfig
        prompt={prompt}
        numImages={numImages}
        aspectRatio={aspectRatio}
        generating={generating}
        onPromptChange={setPrompt}
        onNumImagesChange={setNumImages}
        onAspectRatioChange={setAspectRatio}
        onGenerate={handleGenerate}
      />

      <ImageGenResults images={images} onRetry={handleRetry} retryingId={retryingId} />
    </div>
  );
}
