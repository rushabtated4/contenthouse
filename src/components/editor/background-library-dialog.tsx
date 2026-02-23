"use client";

import { useEditorStore } from "@/stores/editor-store";
import { useBackgrounds } from "@/hooks/use-backgrounds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface BackgroundLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideIndex: number;
}

export function BackgroundLibraryDialog({ open, onOpenChange, slideIndex }: BackgroundLibraryDialogProps) {
  const setBackgroundFromLibrary = useEditorStore((s) => s.setBackgroundFromLibrary);
  const { backgrounds, loading, hasMore, loadMore, mutate } = useBackgrounds();

  const handleSelect = (bg: { id: string; image_url: string }) => {
    setBackgroundFromLibrary(slideIndex, bg.image_url, bg.id);
    onOpenChange(false);
    toast.success("Background applied");
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/backgrounds/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      mutate();
      toast.success("Background deleted");
    } catch {
      toast.error("Failed to delete background");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background Library</DialogTitle>
        </DialogHeader>

        {loading && !backgrounds.length ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : backgrounds.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            No backgrounds yet. Generate or upload some!
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {backgrounds.map((bg) => (
                <div key={bg.id} className="relative group">
                  <button
                    onClick={() => handleSelect(bg)}
                    className="w-full aspect-[4/5] rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    <img
                      src={bg.image_url}
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(bg.id);
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
