"use client";

import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HookGeneratedImage } from "@/types/hooks";

interface ImageGenResultsProps {
  images: HookGeneratedImage[];
  onRetry?: (imageId: string) => void;
  retryingId?: string | null;
}

export function ImageGenResults({ images, onRetry, retryingId }: ImageGenResultsProps) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {images.map((img) => (
        <div key={img.id} className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
          {img.status === "completed" && img.image_url && (
            <img
              src={img.image_url}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          )}

          {img.status === "generating" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {img.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
              <AlertCircle className="w-6 h-6 text-destructive" />
              <p className="text-xs text-destructive text-center">{img.error_message || "Failed"}</p>
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRetry(img.id)}
                  disabled={retryingId === img.id}
                >
                  {retryingId === img.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
