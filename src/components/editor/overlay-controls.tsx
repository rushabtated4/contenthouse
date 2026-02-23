"use client";

import { useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OverlayLibraryDialog } from "./overlay-library-dialog";
import { Library, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function OverlayControls() {
  const slides = useEditorStore((s) => s.slides);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const addOverlayImage = useEditorStore((s) => s.addOverlayImage);
  const updateOverlayImage = useEditorStore((s) => s.updateOverlayImage);
  const deleteOverlayImage = useEditorStore((s) => s.deleteOverlayImage);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const activeSlide = slides[activeSlideIndex];
  if (!activeSlide) return null;

  // Find if a single overlay is selected
  const selectedOverlay = selectedIds.length === 1
    ? activeSlide.overlayImages.find((o) => o.id === selectedIds[0])
    : null;

  const loadImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/overlays", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const dims = await loadImageDimensions(data.url);
      addOverlayImage(activeSlideIndex, data.url, dims.width, dims.height);
      toast.success("Overlay added");
    } catch {
      toast.error("Failed to upload overlay");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Overlays</h3>

      <div className="grid grid-cols-2 gap-2">
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
      </div>

      {/* Show overlay properties when a single overlay is selected */}
      {selectedOverlay && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Selected Overlay</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive h-7"
              onClick={() => deleteOverlayImage(activeSlideIndex, selectedOverlay.id)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Size (% of canvas)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted-foreground">Width</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={Math.round(selectedOverlay.width)}
                  onChange={(e) =>
                    updateOverlayImage(activeSlideIndex, selectedOverlay.id, {
                      width: Math.max(1, Math.min(100, Number(e.target.value))),
                    })
                  }
                  className="w-full h-7 px-2 text-xs rounded border border-border bg-background"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Height</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={Math.round(selectedOverlay.height)}
                  onChange={(e) =>
                    updateOverlayImage(activeSlideIndex, selectedOverlay.id, {
                      height: Math.max(1, Math.min(100, Number(e.target.value))),
                    })
                  }
                  className="w-full h-7 px-2 text-xs rounded border border-border bg-background"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Corner Radius</Label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={selectedOverlay.cornerRadius ?? 0}
                onChange={(e) =>
                  updateOverlayImage(activeSlideIndex, selectedOverlay.id, {
                    cornerRadius: parseInt(e.target.value),
                  })
                }
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {selectedOverlay.cornerRadius ?? 0}px
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opacity</Label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(selectedOverlay.opacity * 100)}
                onChange={(e) =>
                  updateOverlayImage(activeSlideIndex, selectedOverlay.id, {
                    opacity: parseInt(e.target.value) / 100,
                  })
                }
                className="flex-1 h-2 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">
                {Math.round(selectedOverlay.opacity * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />

      <OverlayLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        slideIndex={activeSlideIndex}
      />
    </div>
  );
}
