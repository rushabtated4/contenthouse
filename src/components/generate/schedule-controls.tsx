"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Download, Undo2, Zap, X } from "lucide-react";
import { toast } from "sonner";
import type { ProjectAccountWithProject } from "@/types/database";

interface ScheduleControlsProps {
  setId: string;
  initialChannelId?: string | null;
  initialScheduledAt?: string | null;
  initialPostedAt?: string | null;
  onDownload?: () => void;
}

const SLOT_HOURS: Record<number, number[]> = { 1: [21], 2: [9, 21], 3: [9, 15, 21] };

function formatSlot(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ScheduleControls({
  setId,
  initialChannelId,
  initialScheduledAt,
  initialPostedAt,
  onDownload,
}: ScheduleControlsProps) {
  const [accounts, setAccounts] = useState<ProjectAccountWithProject[]>([]);
  const [channelId, setChannelId] = useState(initialChannelId || "");
  const [scheduledAt, setScheduledAt] = useState<string | null>(initialScheduledAt || null);
  const [postedAt, setPostedAt] = useState<string | null>(initialPostedAt || null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [markingPosted, setMarkingPosted] = useState(false);

  useEffect(() => {
    fetch("/api/project-accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, []);

  // Group accounts by project for the Select
  const grouped = accounts.reduce<Record<string, { project: ProjectAccountWithProject["projects"]; accounts: ProjectAccountWithProject[] }>>(
    (acc, account) => {
      const pid = account.project_id;
      if (!acc[pid]) acc[pid] = { project: account.projects, accounts: [] };
      acc[pid].accounts.push(account);
      return acc;
    },
    {}
  );

  async function handleChannelChange(newId: string) {
    setChannelId(newId);
    setScheduledAt(null);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, channelId: newId || null, scheduledAt: null, notes: null }),
      });
    } catch {
      toast.error("Failed to save channel");
    }
  }

  async function handleAutoAssign() {
    const account = accounts.find((a) => a.id === channelId);
    if (!account) return;
    setAutoAssigning(true);
    try {
      const res = await fetch(`/api/schedule?channelId=${channelId}&filter=upcoming`);
      const scheduledSets: { scheduled_at: string }[] = await res.json();

      const daysOfWeek = account.days_of_week ?? [1, 2, 3, 4, 5];
      const postsPerDay = account.posts_per_day ?? 1;
      const hours = SLOT_HOURS[postsPerDay] ?? [21];

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const available: Date[] = [];

      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        if (!daysOfWeek.includes(date.getDay())) continue;
        const dayStr = date.toDateString();

        const daySets = scheduledSets.filter(
          (s) => new Date(s.scheduled_at).toDateString() === dayStr
        );

        for (let i = 0; i < postsPerDay; i++) {
          if (!daySets[i]) {
            const slotDate = new Date(date);
            slotDate.setHours(hours[i] ?? 21, 0, 0, 0);
            if (slotDate > now) available.push(slotDate);
          }
        }
      }

      if (available.length === 0) {
        toast.error("No available slots in the next 7 days");
        return;
      }

      const picked = available[Math.floor(Math.random() * available.length)];
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, channelId, scheduledAt: picked.toISOString(), notes: null }),
      });
      setScheduledAt(picked.toISOString());
      toast.success("Auto-assigned to " + formatSlot(picked));
    } catch {
      toast.error("Failed to auto-assign");
    } finally {
      setAutoAssigning(false);
    }
  }

  async function handleUnassign() {
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, channelId, scheduledAt: null, notes: null }),
      });
      setScheduledAt(null);
    } catch {
      toast.error("Failed to unassign slot");
    }
  }

  async function handleTogglePosted() {
    setMarkingPosted(true);
    const newPosted = !postedAt;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, posted: newPosted }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPostedAt(data.posted_at);
      toast.success(newPosted ? "Marked as posted" : "Unmarked as posted");
    } catch {
      toast.error("Failed to update posted status");
    } finally {
      setMarkingPosted(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Channel select */}
      <Select value={channelId} onValueChange={handleChannelChange}>
        <SelectTrigger className="text-sm w-48 shrink-0">
          <SelectValue placeholder="Select channel..." />
        </SelectTrigger>
        <SelectContent>
          {Object.values(grouped).map(({ project, accounts: groupAccounts }) => (
            <SelectGroup key={project.id}>
              <SelectLabel className="flex items-center gap-1.5">
                {project.color && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                )}
                {project.name}
              </SelectLabel>
              {groupAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  @{acc.username}
                  {acc.nickname ? ` (${acc.nickname})` : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Slot area */}
      {channelId && !scheduledAt && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 text-xs shrink-0"
          onClick={handleAutoAssign}
          disabled={autoAssigning}
        >
          <Zap className="w-3.5 h-3.5" />
          {autoAssigning ? "Finding slot..." : "Auto-assign"}
        </Button>
      )}

      {scheduledAt && (
        <div className="flex items-center gap-1 px-2.5 h-9 rounded-md border border-border bg-muted text-sm text-muted-foreground shrink-0">
          <span>{formatSlot(new Date(scheduledAt))}</span>
          <button
            onClick={handleUnassign}
            className="ml-1 hover:text-foreground transition-colors"
            aria-label="Remove scheduled time"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {onDownload && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-xs shrink-0"
            onClick={onDownload}
          >
            <Download className="w-3.5 h-3.5" />
            Download ZIP
          </Button>
        )}

        <Button
          size="sm"
          variant={postedAt ? "secondary" : "outline"}
          onClick={handleTogglePosted}
          disabled={markingPosted}
          className="gap-1.5 h-9 text-xs shrink-0"
        >
          {postedAt ? (
            <>
              <Undo2 className="w-3 h-3" />
              Undo Posted
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3" />
              Mark as Posted
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
