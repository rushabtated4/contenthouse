"use client";

import { ReviewStatusBadge } from "@/components/shared/review-status-badge";
import { ScheduleControls } from "@/components/generate/schedule-controls";
import { downloadSetAsZip, formatDateForFilename, sanitizeFilename } from "@/lib/client/download-zip";
import { toast } from "sonner";
import type { GenerationSetWithImages } from "@/types/database";

interface EditorGenerationControlsProps {
  set: GenerationSetWithImages;
  onUpdated?: () => void;
}

export function EditorGenerationControls({ set, onUpdated }: EditorGenerationControlsProps) {
  const handleDownload = async () => {
    try {
      const name = set.title ? sanitizeFilename(set.title) : "generation";
      const datePart = set.scheduled_at ? formatDateForFilename(set.scheduled_at) : set.id.slice(0, 8);
      await downloadSetAsZip(set.id, `${name}_${datePart}.zip`);
    } catch {
      toast.error("Failed to download ZIP");
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
      <ReviewStatusBadge
        setId={set.id}
        reviewStatus={set.review_status}
        onToggled={onUpdated}
      />
      <div className="h-4 w-px bg-border" />
      <div className="flex-1 min-w-0">
        <ScheduleControls
          setId={set.id}
          initialChannelId={set.channel_id}
          initialScheduledAt={set.scheduled_at}
          initialPostedAt={set.posted_at}
          onDownload={handleDownload}
          onUpdated={onUpdated}
        />
      </div>
    </div>
  );
}
