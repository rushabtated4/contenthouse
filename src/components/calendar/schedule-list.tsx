"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Undo2, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ScheduledEvent } from "@/hooks/use-scheduled-events";

interface ScheduleListProps {
  events: ScheduledEvent[];
  onRefetch: () => void;
}

function formatScheduledDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleList({ events, onRefetch }: ScheduleListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const handleDownload = async (setId: string) => {
    setDownloadingIds((prev) => new Set(prev).add(setId));
    try {
      const res = await fetch(`/api/images/${setId}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousel-${setId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download ZIP");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }
  };

  const handleTogglePosted = async (setId: string, currentlyPosted: boolean) => {
    setLoadingIds((prev) => new Set(prev).add(setId));
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, posted: !currentlyPosted }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(currentlyPosted ? "Unmarked as posted" : "Marked as posted");
      onRefetch();
    } catch {
      toast.error("Failed to update posted status");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(setId);
        return next;
      });
    }
  };

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">No scheduled events found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {events.map((event) => {
        const isPosted = !!event.extendedProps.postedAt;
        return (
          <div
            key={event.id}
            className="flex items-center gap-3 p-3 hover:bg-warm/50 transition-colors"
          >
            {event.extendedProps.thumbnail ? (
              <img
                src={event.extendedProps.thumbnail}
                alt=""
                className="w-12 h-12 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-muted shrink-0" />
            )}

            {event.extendedProps.videoId ? (
              <Link
                href={`/generate/${event.extendedProps.videoId}`}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatScheduledDate(event.start)}
                  {event.extendedProps.channelLabel && (
                    <span className="text-muted-foreground">· @{event.extendedProps.channelLabel}</span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatScheduledDate(event.start)}
                  {event.extendedProps.channelLabel && (
                    <span className="text-muted-foreground">· @{event.extendedProps.channelLabel}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    disabled={downloadingIds.has(event.extendedProps.setId)}
                    onClick={() => handleDownload(event.extendedProps.setId)}
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingIds.has(event.extendedProps.setId) ? "animate-pulse" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download ZIP</TooltipContent>
              </Tooltip>

              {isPosted ? (
                <Badge className="bg-green-600 hover:bg-green-700 text-xs gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Posted
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  Scheduled
                </Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7 gap-1"
                disabled={loadingIds.has(event.extendedProps.setId)}
                onClick={() =>
                  handleTogglePosted(event.extendedProps.setId, isPosted)
                }
              >
                {isPosted ? (
                  <>
                    <Undo2 className="w-3 h-3" />
                    Undo
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Done
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
