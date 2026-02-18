"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { EngagementStats } from "@/components/shared/engagement-stats";
import { formatCount, formatDate } from "@/lib/utils/format";
import { Eye, Wand2 } from "lucide-react";
import type { VideoWithCount } from "@/hooks/use-videos";

interface VideoCardProps {
  video: VideoWithCount;
}

export function VideoCard({ video }: VideoCardProps) {
  const router = useRouter();
  const firstImage = video.original_images?.[0];
  const account = video.account;

  return (
    <div
      className="group relative h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 ease-out hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer"
      onClick={() => router.push(`/generate/${video.id}`)}
    >
      {/* Thumbnail — fixed aspect ratio */}
      <div className="relative shrink-0">
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

        {/* Regenerate overlay — appears on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-t-xl">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/generate/${video.id}`); }}
            className="flex items-center gap-1.5 bg-white text-black text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg hover:bg-white/90 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>

        {/* TikTok icon overlay - bottom left — links to original post */}
        {video.url ? (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 left-2 hover:scale-110 transition-transform"
            title="View on TikTok"
          >
            <svg
              className="w-5 h-5 text-white drop-shadow-md"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.2 8.2 0 0 0 4.76 1.52V6.77a4.83 4.83 0 0 1-1-.08z" />
            </svg>
          </a>
        ) : (
          <div className="absolute bottom-2 left-2">
            <svg
              className="w-5 h-5 text-white drop-shadow-md"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.88-2.88 2.89 2.89 0 0 1 2.88-2.88c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.71a8.2 8.2 0 0 0 4.76 1.52V6.77a4.83 4.83 0 0 1-1-.08z" />
            </svg>
          </div>
        )}

        {/* Generation count - bottom right */}
        <Badge
          variant="secondary"
          className={`absolute bottom-2 right-2 border-0 text-xs ${
            video.generation_count === 0
              ? "bg-emerald-500/80 text-white"
              : "bg-primary/80 text-primary-foreground"
          }`}
        >
          {video.generation_count === 0 ? "✦ Fresh" : `↻ ${video.generation_count}`}
        </Badge>

        {/* Views badge - top right */}
        {video.views != null && video.views > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-black/60 text-white border-0 text-xs gap-1"
          >
            <Eye className="w-3 h-3" />
            {formatCount(video.views)}
          </Badge>
        )}
      </div>

      {/* Content — flex-1 to fill remaining space, with date pinned to bottom */}
      <div className="flex flex-col flex-1 p-3 overflow-hidden">
        <div className="space-y-1.5 flex-1 min-h-0">
          {/* Engagement stats — single line, no wrap */}
          <EngagementStats
            views={null}
            likes={video.likes}
            comments={video.comments}
            shares={video.shares}
            compact
          />

          {/* Hashtags */}
          <p className="text-xs text-primary truncate">
            {video.hashtags && video.hashtags.length > 0
              ? video.hashtags.map((tag) => `#${tag}`).join(" ")
              : "\u00A0"}
          </p>

          {/* Account info */}
          {account ? (
            <div className="flex items-center gap-1.5">
              <span
                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                style={{
                  backgroundColor: account.app?.color || "#6b7280",
                }}
              >
                {account.app?.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
              <p className="text-xs truncate min-w-0">
                <span className="font-medium text-foreground">@{account.username}</span>
                {account.app?.name && (
                  <span className="text-muted-foreground"> · {account.app.name}</span>
                )}
              </p>
            </div>
          ) : (
            <div className="h-5" />
          )}

          {/* Description */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {video.description || "No description"}
          </p>
        </div>

        {/* Posted date — always pinned to bottom */}
        <p className="text-xs text-muted-foreground/70 pt-1.5 mt-auto">
          Posted {formatDate(video.posted_at || video.created_at)}
        </p>
      </div>
    </div>
  );
}
