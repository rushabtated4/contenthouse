"use client";

import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { HookGeneratedVideoWithImage } from "@/types/hooks";

interface VideoGenProgressProps {
  videos: HookGeneratedVideoWithImage[];
}

export function VideoGenProgress({ videos }: VideoGenProgressProps) {
  if (videos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {videos.map((video) => (
        <div key={video.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          {/* Thumbnail from source image */}
          <div className="w-16 h-20 rounded overflow-hidden bg-muted shrink-0">
            {video.hook_generated_images?.image_url && (
              <img
                src={video.hook_generated_images.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {video.status === "generating" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Generating...</span>
                </>
              )}
              {video.status === "completed" && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Completed</span>
                </>
              )}
              {video.status === "failed" && (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">Failed</span>
                </>
              )}
              {video.status === "pending" && (
                <span className="text-sm text-muted-foreground">Pending</span>
              )}
            </div>
            {video.error_message && (
              <p className="text-xs text-destructive mt-1 truncate">{video.error_message}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
