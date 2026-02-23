"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface OverlayLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideIndex: number;
}

interface OverlayItem {
  name: string;
  url: string;
}

export function OverlayLibraryDialog({ open, onOpenChange, slideIndex }: OverlayLibraryDialogProps) {
  const addOverlayImage = useEditorStore((s) => s.addOverlayImage);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/overlays")
      .then((res) => res.json())
      .then((data) => setOverlays(data.overlays || []))
      .catch(() => setOverlays([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleSelect = async (url: string) => {
    // Load image to get natural dimensions for aspect ratio
    const dims = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = url;
    });
    addOverlayImage(slideIndex, url, dims.width, dims.height);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Overlay Library</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : overlays.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            No overlays yet. Upload some via the overlay controls!
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {overlays.map((item) => (
              <button
                key={item.name}
                onClick={() => handleSelect(item.url)}
                className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition-colors bg-muted/50"
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
