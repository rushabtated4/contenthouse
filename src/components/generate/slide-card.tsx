"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PromptTextarea } from "@/components/shared/prompt-textarea";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { cn } from "@/lib/utils";
import { Check, X, ImagePlus, Upload, Loader2 } from "lucide-react";

interface OverlayItem {
  name: string;
  url: string;
}

interface SlideCardProps {
  index: number;
  imageUrl: string;
  isSelected: boolean;
  prompt: string;
  overlayUrl: string | null;
  onToggle: () => void;
  onPromptChange: (prompt: string) => void;
  onOverlayUpload: (file: File) => void;
  onOverlaySelect: (url: string) => void;
  onOverlayRemove: () => void;
}

export function SlideCard({
  index,
  imageUrl,
  isSelected,
  prompt,
  overlayUrl,
  onToggle,
  onPromptChange,
  onOverlayUpload,
  onOverlaySelect,
  onOverlayRemove,
}: SlideCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [loadingOverlays, setLoadingOverlays] = useState(false);

  useEffect(() => {
    if (popoverOpen && overlays.length === 0) {
      setLoadingOverlays(true);
      fetch("/api/overlays")
        .then((res) => res.json())
        .then((data) => setOverlays(data.overlays || []))
        .catch(() => {})
        .finally(() => setLoadingOverlays(false));
    }
  }, [popoverOpen, overlays.length]);

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

        {overlayUrl && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <img
              src={overlayUrl}
              alt="Overlay"
              className="w-7 h-7 rounded object-cover border border-white/60 shadow"
            />
            <button
              onClick={onOverlayRemove}
              className="w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-destructive transition-colors"
              title="Remove overlay"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
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
              <PromptTextarea
                placeholder="Custom prompt for this slide..."
                value={prompt}
                onChange={onPromptChange}
                className="text-xs min-h-[60px] resize-none"
              />
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs gap-1"
                  >
                    <ImagePlus className="w-3 h-3" />
                    {overlayUrl ? "Change overlay" : "Add overlay"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 p-3 space-y-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1"
                    asChild
                  >
                    <label className="cursor-pointer">
                      <Upload className="w-3 h-3" />
                      Upload new
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onOverlayUpload(file);
                            setPopoverOpen(false);
                          }
                        }}
                      />
                    </label>
                  </Button>

                  {loadingOverlays ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : overlays.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                      {overlays.map((o) => (
                        <button
                          key={o.name}
                          onClick={() => {
                            onOverlaySelect(o.url);
                            setPopoverOpen(false);
                          }}
                          className={cn(
                            "rounded border overflow-hidden hover:ring-2 hover:ring-primary transition-all",
                            overlayUrl === o.url && "ring-2 ring-primary"
                          )}
                        >
                          <img
                            src={o.url}
                            alt={o.name}
                            className="w-full aspect-square object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No existing overlays
                    </p>
                  )}
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      )}
    </div>
  );
}
