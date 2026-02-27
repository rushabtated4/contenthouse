"use client";

import { useBackgrounds } from "@/hooks/use-backgrounds";
import { useEditorStore } from "@/stores/editor-store";
import { BackgroundUploadZone } from "./background-upload-zone";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wand2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FolderContentsViewProps {
  folderId: string;
  folderName: string;
  onBack: () => void;
  onClose: () => void;
}

export function FolderContentsView({ folderId, folderName, onBack, onClose }: FolderContentsViewProps) {
  const { backgrounds, loading, hasMore, loadMore, mutate } = useBackgrounds(folderId);
  const setBackgroundFromLibrary = useEditorStore((s) => s.setBackgroundFromLibrary);
  const autoApplyBackgrounds = useEditorStore((s) => s.autoApplyBackgrounds);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const slidesCount = useEditorStore((s) => s.slides.length);

  const handleSelect = (bg: { id: string; image_url: string }) => {
    setBackgroundFromLibrary(activeSlideIndex, bg.image_url, bg.id);
    onClose();
    toast.success("Background applied");
  };

  const handleAutoApply = async () => {
    // Fetch all images in this folder
    try {
      const res = await fetch(`/api/backgrounds?folderId=${folderId}&limit=999`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const bgs = (data.backgrounds || []).map((bg: { image_url: string; id: string }) => ({
        url: bg.image_url,
        libraryId: bg.id,
      }));
      if (bgs.length === 0) {
        toast.error("No images in this folder");
        return;
      }
      autoApplyBackgrounds(bgs);
      toast.success(`Applied random backgrounds to ${slidesCount - 1} slides`);
      onClose();
    } catch {
      toast.error("Failed to auto-apply backgrounds");
    }
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1 h-auto">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-sm font-medium flex-1 truncate">{folderName}</h3>
        {slidesCount > 1 && (
          <Button variant="outline" size="sm" onClick={handleAutoApply} className="gap-1.5">
            <Wand2 className="w-3.5 h-3.5" />
            Auto Apply
          </Button>
        )}
      </div>

      {/* Upload zone */}
      <BackgroundUploadZone folderId={folderId} onUploadComplete={mutate} />

      {/* Image grid */}
      {loading && !backgrounds.length ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : backgrounds.length === 0 ? (
        <p className="text-center py-4 text-muted-foreground text-sm">
          No images yet. Upload some above!
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            {backgrounds.map((bg) => (
              <div key={bg.id} className="relative group">
                <button
                  onClick={() => handleSelect(bg)}
                  className="w-full aspect-[4/5] rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img src={bg.image_url} alt="Background" className="w-full h-full object-cover" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(bg.id); }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          {hasMore && (
            <Button variant="outline" size="sm" className="w-full mt-3" onClick={loadMore} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
