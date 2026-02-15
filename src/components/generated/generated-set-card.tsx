"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GenerationSetWithVideo } from "@/types/api";

interface GeneratedSetCardProps {
  set: GenerationSetWithVideo;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "partial":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    case "processing":
    case "queued":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function GeneratedSetCard({ set }: GeneratedSetCardProps) {
  const completedImages = set.generated_images.filter((i) => i.status === "completed");
  const firstImage = completedImages.sort((a, b) => a.slide_index - b.slide_index)[0];
  const description = set.videos?.description || set.title;
  const videoId = set.videos?.id || set.video_id;

  const card = (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 ease-out cursor-pointer h-full hover:-translate-y-0.5 py-0 gap-0">
      <div className="aspect-[3/4] bg-muted relative">
        {firstImage?.image_url ? (
          <img
            src={firstImage.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
            No preview
          </div>
        )}
        <div className="absolute top-1.5 right-1.5">
          <Badge variant={statusBadgeVariant(set.status)} className="text-[10px] px-1.5 py-0">
            {set.status}
          </Badge>
        </div>
        {set.posted_at && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-700">
              Posted
            </Badge>
          </div>
        )}
        {!set.posted_at && set.scheduled_at && (
          <div className="absolute top-1.5 left-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/90">
              Scheduled
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-2 space-y-0.5">
        <p className="text-xs font-medium text-foreground line-clamp-1">
          {description?.slice(0, 80) || "Untitled carousel"}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {completedImages.length}/{set.progress_total} slides
          </span>
          <span className="text-[10px] text-muted-foreground">
            {relativeTime(set.created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (videoId) {
    return <Link href={`/generate/${videoId}`}>{card}</Link>;
  }

  return card;
}
