"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { cn } from "@/lib/utils";
import { Check, X, ImagePlus } from "lucide-react";

interface SlideCardProps {
  index: number;
  imageUrl: string;
  isSelected: boolean;
  prompt: string;
  overlayUrl: string | null;
  onToggle: () => void;
  onPromptChange: (prompt: string) => void;
  onOverlayUpload: (file: File) => void;
}

export function SlideCard({
  index,
  imageUrl,
  isSelected,
  prompt,
  onToggle,
  onPromptChange,
  onOverlayUpload,
}: SlideCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div
      className={cn(
        "rounded-lg border-2 transition-all overflow-hidden",
        isSelected
          ? "border-primary bg-card"
          : "border-border bg-card/50 opacity-60"
      )}
    >
      <div className="relative">
        <ImageThumbnail
          src={imageUrl}
          alt={`Slide ${index + 1}`}
          className="w-full !rounded-none"
        />

        <button
          onClick={onToggle}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary text-white"
              : "bg-gray-200 text-gray-500"
          )}
        >
          {isSelected ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </button>

        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {index + 1}
        </span>
      </div>

      {isSelected && (
        <div className="p-2.5 space-y-2">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="text-xs text-primary hover:underline"
          >
            {showPrompt ? "Hide prompt" : "Custom prompt"}
          </button>

          {showPrompt && (
            <>
              <Textarea
                placeholder="Custom prompt for this slide..."
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                className="text-xs min-h-[60px] resize-none"
              />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs gap-1"
                asChild
              >
                <label className="cursor-pointer">
                  <ImagePlus className="w-3 h-3" />
                  Add overlay
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onOverlayUpload(file);
                    }}
                  />
                </label>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
