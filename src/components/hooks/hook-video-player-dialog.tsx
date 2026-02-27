"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface HookVideoPlayerDialogProps {
  videoUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HookVideoPlayerDialog({ videoUrl, open, onOpenChange }: HookVideoPlayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Video Preview</DialogTitle>
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            autoPlay
            className="w-full max-h-[80vh] bg-black"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
