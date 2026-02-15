"use client";

import { useEffect, useState } from "react";
import type { StatsResponse } from "@/types/api";

export function StatsBar() {
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) return null;

  return (
    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground">{stats.totalVideos}</strong> videos
      </span>
      <span>
        <strong className="text-foreground">{stats.totalSets}</strong> sets
      </span>
      <span>
        <strong className="text-foreground">{stats.totalImages}</strong> images
      </span>
      <span>
        ~$<strong className="text-foreground">{stats.estimatedCost.toFixed(2)}</strong> cost
      </span>
    </div>
  );
}
