"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import type {
  GenerationSetWithImages,
} from "@/types/database";

interface OutputDisplayProps {
  sets: GenerationSetWithImages[];
  onRetryImage: (imageId: string) => void;
}

export function OutputDisplay({ sets, onRetryImage }: OutputDisplayProps) {
  if (sets.length === 0) return null;

  const handleDownload = async (setId: string) => {
    window.open(`/api/images/${setId}/download`, "_blank");
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">
        Generated Sets ({sets.length})
      </h3>

      {sets.map((set) => (
        <div
          key={set.id}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Set {set.set_index + 1}
              </span>
              <Badge
                variant={
                  set.status === "completed"
                    ? "default"
                    : set.status === "partial"
                      ? "secondary"
                      : set.status === "failed"
                        ? "destructive"
                        : "outline"
                }
              >
                {set.status}
              </Badge>
            </div>
            {set.generated_images.some((i) => i.status === "completed") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleDownload(set.id)}
              >
                <Download className="w-3.5 h-3.5" />
                Download ZIP
              </Button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {set.generated_images
              .sort((a, b) => a.slide_index - b.slide_index)
              .map((img) => (
                <div
                  key={img.id}
                  className="flex-shrink-0 w-[140px] space-y-1"
                >
                  {img.status === "completed" && img.image_url ? (
                    <ImageThumbnail
                      src={img.image_url}
                      alt={`Generated slide ${img.slide_index + 1}`}
                      width={140}
                      height={175}
                      className="w-[140px]"
                    />
                  ) : img.status === "failed" ? (
                    <div className="w-[140px] aspect-[4/5] rounded-xl bg-destructive/10 flex flex-col items-center justify-center gap-1 p-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <p className="text-[10px] text-destructive text-center line-clamp-2">
                        {img.error_message || "Failed"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 gap-1"
                        onClick={() => onRetryImage(img.id)}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="w-[140px] aspect-[4/5] rounded-xl bg-muted flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    Slide {img.slide_index + 1}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
