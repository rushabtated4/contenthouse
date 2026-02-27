"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Check, Calendar, Play, Trash2 } from "lucide-react";
import type { HookGeneratedVideoWithRelations } from "@/types/hooks";
import { format } from "date-fns";

interface HookVideoCardProps {
  video: HookGeneratedVideoWithRelations;
  onPlay: (url: string) => void;
  onDownload: (id: string) => void;
  onMarkUsed: (id: string, used: boolean) => void;
  onSchedule: (id: string) => void;
  onDelete: (id: string) => void;
}

export function HookVideoCard({ video, onPlay, onDownload, onMarkUsed, onSchedule, onDelete }: HookVideoCardProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div
        className="relative aspect-[9/16] max-h-[250px] bg-black cursor-pointer group"
        onClick={() => video.video_url && onPlay(video.video_url)}
      >
        {video.video_url && (
          <video src={video.video_url} className="w-full h-full object-contain" preload="metadata" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1 flex-wrap">
          {video.is_used && <Badge variant="secondary">Used</Badge>}
          {video.scheduled_at && (
            <Badge variant="outline">{format(new Date(video.scheduled_at), "MMM d")}</Badge>
          )}
          {video.posted_at && <Badge className="bg-green-500">Posted</Badge>}
          {video.project_accounts && (
            <Badge variant="outline">{video.project_accounts.nickname || video.project_accounts.username}</Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {format(new Date(video.created_at), "MMM d, yyyy h:mm a")}
        </p>

        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => onDownload(video.id)}>
            <Download className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={video.is_used ? "default" : "outline"}
            onClick={() => onMarkUsed(video.id, !video.is_used)}
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onSchedule(video.id)}>
            <Calendar className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(video.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
