"use client";

import { Button } from "@/components/ui/button";
import { Download, Check, Calendar, Play } from "lucide-react";
import type { HookGeneratedVideo } from "@/types/hooks";

interface VideoResultCardProps {
  video: HookGeneratedVideo;
  onDownload: (id: string) => void;
  onMarkUsed: (id: string, used: boolean) => void;
  onSchedule: (id: string) => void;
  onPlay: (videoUrl: string) => void;
}

export function VideoResultCard({ video, onDownload, onMarkUsed, onSchedule, onPlay }: VideoResultCardProps) {
  if (video.status !== "completed" || !video.video_url) return null;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="relative aspect-[9/16] max-h-[300px] bg-black cursor-pointer group" onClick={() => onPlay(video.video_url!)}>
        <video src={video.video_url} className="w-full h-full object-contain" preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => onDownload(video.id)}>
            <Download className="w-3 h-3 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant={video.is_used ? "default" : "outline"}
            onClick={() => onMarkUsed(video.id, !video.is_used)}
          >
            <Check className="w-3 h-3 mr-1" />
            {video.is_used ? "Used" : "Mark Used"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSchedule(video.id)}>
            <Calendar className="w-3 h-3 mr-1" />
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
