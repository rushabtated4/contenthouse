"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { EngagementStats } from "@/components/shared/engagement-stats";
import { ExternalLink, RefreshCw } from "lucide-react";
import type { Video } from "@/types/database";

interface VideoCardProps {
  video: Video & { generation_count: number };
}

export function VideoCard({ video }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const firstImage = video.original_images?.[0];

  return (
    <div
      className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 ease-out hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/generate/${video.id}`}>
        <div className="relative">
          {firstImage ? (
            <ImageThumbnail
              src={firstImage}
              alt={video.description || "Carousel"}
              className="w-full rounded-b-none"
            />
          ) : (
            <div className="w-full aspect-[4/5] bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No preview</span>
            </div>
          )}

          {isHovered && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity">
              <Button size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
            </div>
          )}

          {video.generation_count > 0 && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-white/90 text-foreground"
            >
              {video.generation_count} sets
            </Badge>
          )}
        </div>
      </Link>

      <div className="p-3 space-y-2">
        <p className="text-sm text-foreground line-clamp-2">
          {video.description || "No description"}
        </p>

        <EngagementStats
          views={video.views}
          likes={video.likes}
          comments={video.comments}
          shares={video.shares}
          compact
        />

        {video.url && (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View on TikTok
          </a>
        )}
      </div>
    </div>
  );
}
