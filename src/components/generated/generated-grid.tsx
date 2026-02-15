"use client";

import { useState } from "react";
import Link from "next/link";
import { useGeneratedSets } from "@/hooks/use-generated-sets";
import { GeneratedSetCard } from "./generated-set-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, List } from "lucide-react";
import type { GenerationSetWithVideo } from "@/types/api";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Partial", value: "partial" },
  { label: "Failed", value: "failed" },
  { label: "Queued", value: "queued" },
];

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

function TableView({ sets }: { sets: GenerationSetWithVideo[] }) {
  return (
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
          {sets.map((set) => {
            const completedImages = set.generated_images.filter(
              (i) => i.status === "completed"
            );
            const firstImage = completedImages.sort(
              (a, b) => a.slide_index - b.slide_index
            )[0];
            const description = set.videos?.description || set.title;
            const videoId = set.videos?.id || set.video_id;

            const cellContent = (
              <div className="flex items-center gap-3">
                {firstImage?.image_url ? (
                  <img
                    src={firstImage.image_url}
                    alt=""
                    className="w-8 h-8 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate max-w-[250px]">
                  {description?.slice(0, 60) || "Untitled carousel"}
                </span>
              </div>
            );

            return (
              <tr
                key={set.id}
                className="border-b border-border last:border-0 hover:bg-warm/50 transition-colors duration-150 ease-out"
              >
                <td className="px-4 py-2.5">
                  {videoId ? (
                    <Link
                      href={`/generate/${videoId}`}
                      className="flex items-center gap-3"
                    >
                      {cellContent}
                    </Link>
                  ) : (
                    cellContent
                  )}
                </td>
                <td className="text-center px-3 py-2.5">
                  <span className="text-sm text-foreground">
                    {completedImages.length}
                    <span className="text-muted-foreground">/{set.progress_total}</span>
                  </span>
                </td>
                <td className="text-center px-3 py-2.5">
                  <Badge
                    variant={statusBadgeVariant(set.status)}
                    className="text-xs"
                  >
                    {set.status}
                  </Badge>
                </td>
                <td className="text-center px-3 py-2.5">
                  {set.posted_at ? (
                    <span className="text-xs font-medium text-green-600">
                      Posted
                    </span>
                  ) : set.scheduled_at ? (
                    <span className="text-xs font-medium text-primary">
                      Scheduled
                    </span>
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GeneratedGrid() {
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const limit = 20;

  const { sets, total, hasMore, loading } = useGeneratedSets({
    status,
    sort,
    page,
    limit,
  });

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Generated Carousels
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} total sets
          </p>
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "ghost"}
            onClick={() => setViewMode("table")}
            className="rounded-none gap-1 text-xs"
          >
            <List className="w-3.5 h-3.5" />
            Table
          </Button>
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            onClick={() => setViewMode("grid")}
            className="rounded-none gap-1 text-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={status === tab.value ? "default" : "ghost"}
              onClick={() => handleStatusChange(tab.value)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="w-36">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="text-sm h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )
      ) : sets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No generation sets found
            {status !== "all" && ` with status "${status}"`}.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {sets.map((set) => (
                <GeneratedSetCard key={set.id} set={set} />
              ))}
            </div>
          ) : (
            <TableView sets={sets} />
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
