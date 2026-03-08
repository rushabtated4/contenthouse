"use client";

import { useState } from "react";
import { CalendarClock, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadSetAsZip, formatDateForFilename, sanitizeFilename } from "@/lib/client/download-zip";
import type { ScheduledSetSummary } from "@/hooks/use-account-overview";
import type { ProjectAccount } from "@/types/database";

interface Props {
  scheduledSets: ScheduledSetSummary[];
  allAccounts: ProjectAccount[];
  onMutate: () => void;
}

export function TodayPosts({ scheduledSets, allAccounts, onMutate }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaySets = scheduledSets
    .filter((s) => {
      if (!s.scheduled_at || s.posted_at) return false;
      const d = new Date(s.scheduled_at);
      return d >= today && d < tomorrow;
    })
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());

  function getAccountName(channelId: string | null): string {
    if (!channelId) return "Unassigned";
    const account = allAccounts.find((a) => a.id === channelId);
    if (!account) return "Unknown";
    return `@${account.username}`;
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleDownload(set: ScheduledSetSummary) {
    setLoadingAction(`download-${set.id}`);
    try {
      const account = allAccounts.find((a) => a.id === set.channel_id);
      const channel = sanitizeFilename(account?.nickname ?? account?.username ?? "post");
      const date = set.scheduled_at ? formatDateForFilename(set.scheduled_at) : set.id.slice(0, 8);
      await downloadSetAsZip(set.id, `${channel}_${date}.zip`);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleMarkPosted(setId: string) {
    setLoadingAction(`posted-${setId}`);
    try {
      await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, posted: true }),
      });
      onMutate();
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10">
      <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">To Post Today</span>
        {todaySets.length > 0 && (
          <span className="text-[11px] font-medium bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
            {todaySets.length}
          </span>
        )}
      </div>

      {todaySets.length === 0 ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          Nothing scheduled for today.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {todaySets.map((set) => (
            <div key={set.id} className="px-4 py-2 flex items-center gap-3">
              {/* Thumbnail */}
              {set.thumbnail_url ? (
                <img
                  src={set.thumbnail_url}
                  alt=""
                  className="w-10 h-[50px] object-cover rounded shrink-0"
                />
              ) : (
                <div className="w-10 h-[50px] bg-muted rounded shrink-0" />
              )}

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {set.title || "Untitled"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getAccountName(set.channel_id)}
                  <span className="mx-1.5">·</span>
                  {formatTime(set.scheduled_at!)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  disabled={loadingAction === `download-${set.id}`}
                  onClick={() => handleDownload(set)}
                >
                  {loadingAction === `download-${set.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  ZIP
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30"
                  disabled={loadingAction === `posted-${set.id}`}
                  onClick={() => handleMarkPosted(set.id)}
                >
                  {loadingAction === `posted-${set.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Posted
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
