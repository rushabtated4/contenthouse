"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RecentSet } from "@/types/api";

interface RecentActivityProps {
  sets: RecentSet[];
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

export function RecentActivity({ sets }: RecentActivityProps) {
  if (sets.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Recent Sets</h3>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No generation sets yet. Start by fetching a TikTok carousel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3">Recent Sets</h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left font-medium px-4 py-2.5">Description</th>
              <th className="text-center font-medium px-3 py-2.5">Slides</th>
              <th className="text-center font-medium px-3 py-2.5">Status</th>
              <th className="text-center font-medium px-3 py-2.5">Schedule</th>
              <th className="text-right font-medium px-4 py-2.5">Created</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr
                key={set.id}
                className="border-b border-border last:border-0 hover:bg-warm/50 transition-colors duration-150 ease-out"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/generate/${set.id}`}
                    className="flex items-center gap-3"
                  >
                    {set.thumbnail_url ? (
                      <img
                        src={set.thumbnail_url}
                        alt=""
                        className="w-8 h-8 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                      {set.video_description?.slice(0, 50) || "Untitled carousel"}
                    </span>
                  </Link>
                </td>
                <td className="text-center px-3 py-2.5">
                  <span className="text-sm text-foreground">
                    {set.progress_current}
                    <span className="text-muted-foreground">/{set.progress_total}</span>
                  </span>
                </td>
                <td className="text-center px-3 py-2.5">
                  <Badge variant={statusBadgeVariant(set.status)} className="text-xs">
                    {set.status}
                  </Badge>
                </td>
                <td className="text-center px-3 py-2.5">
                  {set.posted_at ? (
                    <span className="text-xs font-medium text-green-600">Posted</span>
                  ) : set.scheduled_at ? (
                    <span className="text-xs font-medium text-primary">Scheduled</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
                <td className="text-right px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(set.created_at)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
