"use client";

import { Badge } from "@/components/ui/badge";
import { EngagementStats } from "@/components/shared/engagement-stats";
import { formatDate } from "@/lib/utils/format";
import type { Video } from "@/types/database";

interface VideoMetaBarProps {
  video: Video;
}

export function VideoMetaBar({ video }: VideoMetaBarProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-2 mb-1">
            {video.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground">
            Posted {formatDate(video.posted_at)}
          </p>
        </div>
        <EngagementStats
          views={video.views}
          likes={video.likes}
          comments={video.comments}
          shares={video.shares}
        />
      </div>

      {video.hashtags && video.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {video.hashtags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs font-normal"
            >
              #{tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
