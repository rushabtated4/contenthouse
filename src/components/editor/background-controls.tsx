"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BackgroundLibraryDialog } from "./background-library-dialog";
import { RefreshCw, Upload, Library, CopyCheck, Loader2, Plus, Palette, X } from "lucide-react";
import { toast } from "sonner";

export function BackgroundControls() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const bgGenerationStatus = useEditorStore((s) => s.bgGenerationStatus);
  const updateBgPrompt = useEditorStore((s) => s.updateBgPrompt);
  const generateBackground = useEditorStore((s) => s.generateBackground);
  const applyBackgroundToAll = useEditorStore((s) => s.applyBackgroundToAll);
  const setBackgroundFromUpload = useEditorStore((s) => s.setBackgroundFromUpload);
  const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);
  const setBackgroundTint = useEditorStore((s) => s.setBackgroundTint);
  const applyTintToAll = useEditorStore((s) => s.applyTintToAll);
  const addTextBlock = useEditorStore((s) => s.addTextBlock);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const activeSlide = slides[activeSlideIndex];
  const isLoading = bgGenerationStatus[activeSlideIndex] === "loading";

  if (!activeSlide) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/backgrounds", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setBackgroundFromUpload(activeSlideIndex, data.image_url);
      toast.success("Background uploaded");
    } catch {
      toast.error("Failed to upload background");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleApplyToAll = () => {
    if (activeSlide.backgroundUrl) {
      applyBackgroundToAll(activeSlide.backgroundUrl, activeSlide.backgroundLibraryId);
      toast.success("Background applied to all slides");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Background</h3>

      {/* Add Text Block */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => addTextBlock(activeSlideIndex)}
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Text Block
      </Button>

      {/* Background Color */}
      <div className="space-y-1.5">
        <Label className="text-xs">Background Color</Label>
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={activeSlide.backgroundColor ?? "#000000"}
            onChange={(e) => setBackgroundColor(activeSlideIndex, e.target.value)}
            className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
          />
          {activeSlide.backgroundColor ? (
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-muted-foreground">{activeSlide.backgroundColor}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-auto"
                onClick={() => setBackgroundColor(activeSlideIndex, null)}
                title="Remove color, use image"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No color set (using image)</span>
          )}
        </div>
      </div>

      {/* Background Tint (only when using a background image) */}
      {activeSlide.backgroundUrl && !activeSlide.backgroundColor && (
        <div className="space-y-1.5">
          <Label className="text-xs">Image Tint</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={activeSlide.backgroundTintColor ?? "#000000"}
              onChange={(e) =>
                setBackgroundTint(
                  activeSlideIndex,
                  e.target.value,
                  activeSlide.backgroundTintOpacity > 0 ? activeSlide.backgroundTintOpacity : 0.3
                )
              }
              className="w-8 h-8 rounded border border-border cursor-pointer p-0.5"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              title="Black tint"
              onClick={() =>
                setBackgroundTint(
                  activeSlideIndex,
                  "#000000",
                  activeSlide.backgroundTintOpacity > 0 ? activeSlide.backgroundTintOpacity : 0.3
                )
              }
            >
              B
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              title="White tint"
              onClick={() =>
                setBackgroundTint(
                  activeSlideIndex,
                  "#FFFFFF",
                  activeSlide.backgroundTintOpacity > 0 ? activeSlide.backgroundTintOpacity : 0.3
                )
              }
            >
              W
            </Button>
            {activeSlide.backgroundTintColor && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="Clear tint"
                onClick={() => setBackgroundTint(activeSlideIndex, null, 0)}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          {activeSlide.backgroundTintColor && (
            <>
              <div className="flex gap-2 items-center">
                <Label className="text-xs w-16 shrink-0">Opacity</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeSlide.backgroundTintOpacity * 100)}
                  onChange={(e) =>
                    setBackgroundTint(
                      activeSlideIndex,
                      activeSlide.backgroundTintColor,
                      parseInt(e.target.value) / 100
                    )
                  }
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {Math.round(activeSlide.backgroundTintOpacity * 100)}%
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  applyTintToAll(activeSlide.backgroundTintColor, activeSlide.backgroundTintOpacity);
                  toast.success("Tint applied to all slides");
                }}
              >
                <CopyCheck className="w-3.5 h-3.5 mr-1" />
                Apply Tint to All
              </Button>
            </>
          )}
        </div>
      )}

      {/* BG Prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs">Background Prompt</Label>
        <Textarea
          value={activeSlide.bgPrompt}
          onChange={(e) => updateBgPrompt(activeSlideIndex, e.target.value)}
          rows={3}
          className="text-xs"
        />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateBackground(activeSlideIndex)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
          )}
          Regenerate
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5 mr-1" />
          Upload
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setLibraryOpen(true)}
        >
          <Library className="w-3.5 h-3.5 mr-1" />
          Library
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyToAll}
          disabled={!activeSlide.backgroundUrl}
        >
          <CopyCheck className="w-3.5 h-3.5 mr-1" />
          Apply All
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <BackgroundLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        slideIndex={activeSlideIndex}
      />
    </div>
  );
}
