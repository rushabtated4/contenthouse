"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { downloadSetAsZip, formatDateForFilename, sanitizeFilename } from "@/lib/client/download-zip";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Pencil,
  User,
  ExternalLink,
  Download,
  X,
  Check,
  Undo2,
  Plus,
  Calendar,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleConfigEditor } from "./schedule-config-editor";
import { AssignSetModal } from "./assign-set-modal";
import type { ProjectAccount } from "@/types/database";
import type { PostingSlot, ScheduledSetSummary, DayCell } from "@/hooks/use-account-overview";
import { computeWeekGrid, computeSlots } from "@/hooks/use-account-overview";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface Props {
  account: ProjectAccount;
  scheduledSets: ScheduledSetSummary[];
  onMutate: () => void;
}

interface PopoverState {
  slot: PostingSlot;
  cell: DayCell;
  x: number;
  y: number;
}

export function AccountScheduleCard({ account, scheduledSets, onMutate }: Props) {
  const router = useRouter();
  const [localAccount, setLocalAccount] = useState<ProjectAccount>(account);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [assignSlot, setAssignSlot] = useState<PostingSlot | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    thumbnailUrl: string | null;
    x: number;
    y: number;
  } | null>(null);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const weekGrid = computeWeekGrid(localAccount, scheduledSets);
  const slots = computeSlots(localAccount, scheduledSets);
  const emptyCount = slots.filter((s) => s.status === "empty").length;
  const scheduledCount = slots.filter((s) => s.status === "scheduled").length;
  const postedCount = slots.filter((s) => s.status === "posted").length;
  const daysOfWeek = localAccount.days_of_week ?? [1, 2, 3, 4, 5];
  const postsPerDay = localAccount.posts_per_day ?? 1;

  function handleSave(updated: ProjectAccount) {
    setLocalAccount(updated);
    setEditing(false);
    onMutate();
  }

  function handleCellHover(e: React.MouseEvent, cell: DayCell) {
    if (popover) return; // don't show tooltip when popover is open
    if (!cell.active || cell.slots.length === 0) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dateStr = cell.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const lines = cell.slots.map((s) => {
      if (s.status === "posted") return `\u2705 Posted${s.set?.title ? `: ${s.set.title}` : ""}`;
      if (s.status === "scheduled") return `\ud83d\udcc5 Scheduled${s.set?.title ? `: ${s.set.title}` : ""}`;
      return "\u26a0\ufe0f Empty — click to assign";
    });

    // Pick thumbnail from first non-empty slot
    const thumbSlot = cell.slots.find((s) => s.set?.thumbnail_url);
    setTooltip({
      text: `${dateStr}\n${lines.join("\n")}`,
      thumbnailUrl: thumbSlot?.set?.thumbnail_url ?? null,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 8,
    });
  }

  function isCellPast(cell: DayCell): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return cell.date < today;
  }

  function handleCellClick(e: React.MouseEvent, cell: DayCell) {
    if (!cell.active) return;
    setTooltip(null);

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Block assignment to past dates
    const allEmpty = cell.slots.every((s) => s.status === "empty");
    if (allEmpty && cell.slots.length > 0) {
      if (isCellPast(cell)) return;
      setAssignSlot(cell.slots[0]);
      return;
    }

    // If there are any non-empty slots, show the popover
    const hasContent = cell.slots.some((s) => s.status !== "empty");
    if (hasContent) {
      // Pick the first non-empty slot for the popover, or first slot
      const targetSlot = cell.slots.find((s) => s.status !== "empty") ?? cell.slots[0];
      setPopover({
        slot: targetSlot,
        cell,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }

  async function handleRemoveTime(setId: string, channelId: string) {
    setActionLoading("remove-time");
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, channelId, scheduledAt: null, notes: null }),
      });
      setPopover(null);
      onMutate();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnassign(setId: string) {
    setActionLoading("unassign");
    try {
      await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId }),
      });
      setPopover(null);
      onMutate();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPosted(setId: string, posted: boolean) {
    setActionLoading(posted ? "posted" : "undo");
    try {
      await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, posted }),
      });
      setPopover(null);
      onMutate();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload(setId: string) {
    setActionLoading("download");
    try {
      const channel = sanitizeFilename(account.nickname ?? "channel");
      const date = popover?.slot.set?.scheduled_at
        ? formatDateForFilename(popover.slot.set.scheduled_at)
        : setId.slice(0, 8);
      await downloadSetAsZip(setId, `${channel}_${date}.zip`);
    } finally {
      setActionLoading(null);
    }
  }

  function handleViewPost(videoId: string | null, setId: string) {
    setPopover(null);
    if (videoId) {
      router.push(`/generate/${videoId}`);
    } else {
      // Uploaded post — no video page, open generate page with set context
      router.push(`/generated`);
    }
  }

  function getCellColor(cell: DayCell): string {
    if (!cell.active) return "bg-muted/30";
    if (cell.slots.length === 0) return "bg-muted/30";

    const statuses = cell.slots.map((s) => s.status);
    if (statuses.every((s) => s === "posted")) return "bg-green-500";
    if (statuses.every((s) => s === "scheduled")) return "bg-blue-500";
    if (statuses.every((s) => s === "empty")) return isCellPast(cell) ? "bg-muted/30" : "bg-orange-400 ring-1 ring-orange-500/50";
    // mixed: some posted/scheduled, some empty
    if (statuses.includes("empty")) return "bg-orange-400 ring-1 ring-orange-500/50";
    return "bg-blue-500";
  }

  return (
    <>
      <div ref={cardRef} className="rounded-lg border border-border relative">
        {/* Single-row header */}
        <div className="px-3 py-2 bg-muted/30">
          {editing ? (
            <ScheduleConfigEditor
              account={localAccount}
              onSave={handleSave}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>

              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>

              <span className="text-sm font-medium truncate">
                @{localAccount.username}
                {localAccount.nickname && (
                  <span className="text-muted-foreground font-normal ml-1 text-xs">
                    {localAccount.nickname}
                  </span>
                )}
              </span>

              <div className="flex gap-0.5 shrink-0">
                {DAY_LABELS.map((label, i) => (
                  <span
                    key={i}
                    className={`inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-medium ${
                      daysOfWeek.includes(i)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground/40"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              <span className="text-[11px] text-muted-foreground shrink-0">
                {postsPerDay}/day
              </span>

              {emptyCount > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-orange-600 dark:text-orange-400 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {emptyCount}
                </span>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1.5 text-[11px] gap-0.5 ml-auto shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
            </div>
          )}
        </div>

        {/* Collapsed summary */}
        {!expanded && !editing && (
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t border-border">
            {postedCount > 0 && (
              <span className="text-green-600 dark:text-green-400">{postedCount} posted</span>
            )}
            {postedCount > 0 && (scheduledCount > 0 || emptyCount > 0) && <span> · </span>}
            {scheduledCount > 0 && <span>{scheduledCount} scheduled</span>}
            {scheduledCount > 0 && emptyCount > 0 && <span> · </span>}
            {emptyCount > 0 && (
              <span className="text-orange-600 dark:text-orange-400">{emptyCount} empty</span>
            )}
            {scheduledCount === 0 && emptyCount === 0 && postedCount === 0 && <span>No slots</span>}
          </div>
        )}

        {/* Mini calendar grid */}
        {expanded && !editing && (
          <div className="px-3 py-2 border-t border-border">
            {weekGrid.length === 0 ? (
              <div className="text-xs text-muted-foreground py-1">
                No posting days configured.
              </div>
            ) : (
              <div className="space-y-1">
                {/* Day-of-week header */}
                <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-1">
                  <span />
                  {DAY_LABELS.map((label, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-muted-foreground text-center font-medium"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {/* Week rows */}
                {weekGrid.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-[48px_repeat(7,1fr)] gap-1">
                    <span className="text-[10px] text-muted-foreground leading-7 truncate">
                      {week.weekLabel}
                    </span>
                    {week.days.map((cell, di) => (
                      <div
                        key={di}
                        className={`h-7 w-full rounded flex items-center justify-center ${getCellColor(cell)} ${cell.active && !(isCellPast(cell) && cell.slots.every((s) => s.status === "empty")) ? "cursor-pointer hover:opacity-80" : ""} transition-colors`}
                        onMouseEnter={(e) => handleCellHover(e, cell)}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(e) => handleCellClick(e, cell)}
                      >
                        {cell.active && postsPerDay > 1 && cell.slots.length > 0 && (
                          <span className="text-[9px] font-bold text-white">
                            {cell.slots.filter((s) => s.status !== "empty").length}/{postsPerDay}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-3 pt-1">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-sm bg-green-500 inline-block" /> Posted
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-sm bg-blue-500 inline-block" /> Scheduled
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-sm bg-orange-400 inline-block" /> Empty
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tooltip (hover) */}
        {tooltip && !popover && (
          <div
            className="absolute z-50 pointer-events-none bg-popover text-popover-foreground border border-border rounded-lg shadow-md overflow-hidden"
            style={{
              left: Math.min(Math.max(tooltip.x, 60), 240),
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="px-2 py-1.5 text-[11px] whitespace-pre-line">
              {tooltip.text}
            </div>
          </div>
        )}

        {/* Action popover (click) */}
        {popover && (
          <>
            {/* Backdrop to close */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPopover(null)}
            />
            <div
              className="absolute z-50 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-1.5 min-w-[180px]"
              style={{
                left: Math.min(Math.max(popover.x, 20), 220),
                top: popover.y + 12,
                transform: "translateX(-50%)",
              }}
            >
              {/* Date header */}
              <div className="flex items-start gap-2 px-2 py-1 text-[11px] font-medium text-muted-foreground border-b border-border mb-1">
                {popover.slot.set?.thumbnail_url && (
                  <img
                    src={popover.slot.set.thumbnail_url}
                    alt=""
                    className="w-12 aspect-[4/5] object-cover rounded shrink-0"
                  />
                )}
                <div className="min-w-0">
                  {popover.cell.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                  {popover.slot.set?.title && (
                    <span className="block text-foreground truncate">{popover.slot.set.title}</span>
                  )}
                </div>
              </div>

              {/* Slot list for multi-post days */}
              {popover.cell.slots.length > 1 && (
                <div className="px-2 py-1 mb-1 border-b border-border">
                  {popover.cell.slots.map((s, i) => (
                    <button
                      key={i}
                      className={`flex items-center gap-1.5 w-full text-left text-[11px] py-0.5 rounded px-1 hover:bg-muted/50 ${
                        s === popover.slot ? "bg-muted" : ""
                      }`}
                      onClick={() =>
                        setPopover((prev) => (prev ? { ...prev, slot: s } : null))
                      }
                    >
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          s.status === "posted"
                            ? "bg-green-500"
                            : s.status === "scheduled"
                              ? "bg-blue-500"
                              : "bg-orange-400"
                        }`}
                      />
                      <span>
                        Slot {i + 1}: {s.status === "posted" ? "Posted" : s.status === "scheduled" ? "Scheduled" : "Empty"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions for the selected slot */}
              {popover.slot.status === "empty" ? (
                !isCellPast(popover.cell) && (
                  <PopoverButton
                    icon={<Plus className="h-3.5 w-3.5" />}
                    label="Assign set"
                    onClick={() => {
                      setPopover(null);
                      setAssignSlot(popover.slot);
                    }}
                  />
                )
              ) : (
                <>
                  {/* View post */}
                  <PopoverButton
                    icon={<ExternalLink className="h-3.5 w-3.5" />}
                    label="View post"
                    onClick={() =>
                      handleViewPost(popover.slot.set!.video_id, popover.slot.set!.id)
                    }
                  />

                  {/* Download ZIP */}
                  <PopoverButton
                    icon={
                      actionLoading === "download" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )
                    }
                    label="Download ZIP"
                    disabled={actionLoading === "download"}
                    onClick={() => handleDownload(popover.slot.set!.id)}
                  />

                  {/* Mark as posted / Undo */}
                  {popover.slot.status === "scheduled" ? (
                    <PopoverButton
                      icon={
                        actionLoading === "posted" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )
                      }
                      label="Mark as posted"
                      disabled={actionLoading === "posted"}
                      onClick={() => handleMarkPosted(popover.slot.set!.id, true)}
                      className="text-green-600 dark:text-green-400"
                    />
                  ) : (
                    <PopoverButton
                      icon={
                        actionLoading === "undo" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )
                      }
                      label="Undo posted"
                      disabled={actionLoading === "undo"}
                      onClick={() => handleMarkPosted(popover.slot.set!.id, false)}
                    />
                  )}

                  {/* Remove time only */}
                  <PopoverButton
                    icon={
                      actionLoading === "remove-time" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )
                    }
                    label="Remove time"
                    disabled={actionLoading === "remove-time"}
                    onClick={() =>
                      handleRemoveTime(
                        popover.slot.set!.id,
                        popover.slot.set!.channel_id!
                      )
                    }
                    className="text-orange-600 dark:text-orange-400"
                  />

                  {/* Unassign channel + time */}
                  <PopoverButton
                    icon={
                      actionLoading === "unassign" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )
                    }
                    label="Unassign channel & time"
                    disabled={actionLoading === "unassign"}
                    onClick={() => handleUnassign(popover.slot.set!.id)}
                    className="text-red-600 dark:text-red-400"
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>

      <AssignSetModal
        open={assignSlot !== null}
        slot={assignSlot}
        account={localAccount}
        onClose={() => setAssignSlot(null)}
        onAssigned={() => {
          setAssignSlot(null);
          onMutate();
        }}
      />
    </>
  );
}

function PopoverButton({
  icon,
  label,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`flex items-center gap-2 w-full text-left text-[12px] px-2 py-1.5 rounded hover:bg-muted/60 disabled:opacity-40 ${className ?? ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}
