"use client";

import { formatCount } from "@/lib/utils/format";
import { Eye, Heart, MessageCircle, Share2 } from "lucide-react";

interface EngagementStatsProps {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  compact?: boolean;
}

export function EngagementStats({
  views,
  likes,
  comments,
  shares,
  compact,
}: EngagementStatsProps) {
  const stats = [
    { icon: Eye, value: views, label: "views" },
    { icon: Heart, value: likes, label: "likes" },
    { icon: MessageCircle, value: comments, label: "comments" },
    { icon: Share2, value: shares, label: "shares" },
  ];

  return (
    <div className={`flex ${compact ? "gap-2" : "gap-3"} text-muted-foreground`}>
      {stats.map(({ icon: Icon, value, label }) => (
        <div
          key={label}
          className={`flex items-center gap-1 ${compact ? "text-xs" : "text-sm"}`}
          title={label}
        >
          <Icon className={compact ? "w-3 h-3" : "w-4 h-4"} />
          <span>{formatCount(value)}</span>
        </div>
      ))}
    </div>
  );
}
