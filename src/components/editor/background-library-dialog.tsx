"use client";

import { useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderGridView } from "./folder-grid-view";
import { FolderContentsView } from "./folder-contents-view";
import { toast } from "sonner";

interface BackgroundLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideIndex: number;
}

export function BackgroundLibraryDialog({ open, onOpenChange, slideIndex }: BackgroundLibraryDialogProps) {
  const setBackgroundFromLibrary = useEditorStore((s) => s.setBackgroundFromLibrary);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);

  const handleSelect = (bg: { id: string; image_url: string }) => {
    setBackgroundFromLibrary(slideIndex, bg.image_url, bg.id);
    onOpenChange(false);
    toast.success("Background applied");
  };

  const handleClose = () => onOpenChange(false);

  // Reset to folder grid when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setCurrentFolder(null);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Background Library</DialogTitle>
        </DialogHeader>

        {currentFolder ? (
          <FolderContentsView
            folderId={currentFolder.id}
            folderName={currentFolder.name}
            onBack={() => setCurrentFolder(null)}
            onClose={handleClose}
          />
        ) : (
          <FolderGridView
            onOpenFolder={(id, name) => setCurrentFolder({ id, name })}
            onSelectBackground={handleSelect}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
