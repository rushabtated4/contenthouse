"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, X, Plus } from "lucide-react";
import { DemoVideoPickerDialog } from "../demo-video-picker-dialog";
import type { DemoVideo } from "@/types/hook-editor";

interface DemoVideoSectionProps {
  demoVideoId: string | null;
  demoVideoUrl: string | null;
  demoThumbnailUrl: string | null;
  demoDuration: number | null;
  onSelectDemo: (demo: DemoVideo) => void;
  onRemoveDemo: () => void;
}

export function DemoVideoSection({
  demoVideoId,
  demoVideoUrl,
  demoThumbnailUrl,
  demoDuration,
  onSelectDemo,
  onRemoveDemo,
}: DemoVideoSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Film className="w-4 h-4" />
          Demo Video
        </h3>
      </div>

      {demoVideoId && demoVideoUrl ? (
        <div className="flex items-start gap-3">
          <div className="relative w-20 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
            {demoThumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={demoThumbnailUrl} alt="Demo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-5 h-5 text-muted-foreground/40" />
              </div>
            )}
            {demoDuration != null && (
              <Badge variant="secondary" className="absolute bottom-0.5 right-0.5 text-[8px] px-1 py-0">
                {demoDuration.toFixed(1)}s
              </Badge>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">
              Demo will be concatenated after the hook video.
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setPickerOpen(true)}>
                Change
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-xs text-destructive" onClick={onRemoveDemo}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Attach Demo Video
        </Button>
      )}

      <DemoVideoPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={onSelectDemo}
      />
    </div>
  );
}
