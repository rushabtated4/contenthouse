"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import type { ProjectAccount } from "@/types/database";

// Fixed posting times per slot index, keyed by posts_per_day
// 1/day → 9 PM | 2/day → 9 AM, 9 PM | 3/day → 9 AM, 3 PM, 9 PM
const SLOT_HOURS: Record<number, number[]> = {
  1: [21],
  2: [9, 21],
  3: [9, 15, 21],
};

interface SetCard {
  id: string;
  title: string | null;
  created_at: string;
  channel_id: string | null;
  generated_images: { image_url: string | null }[];
}

interface Props {
  open: boolean;
  slot: { date: Date; slotIndex: number } | null;
  account: ProjectAccount;
  onClose: () => void;
  onAssigned: () => void;
}

export function AssignSetModal({ open, slot, account, onClose, onAssigned }: Props) {
  const [sets, setSets] = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/generation-sets?status=completed&unscheduled=true&limit=50")
      .then((r) => r.json())
      .then((d) => setSets(d.sets ?? []))
      .catch(() => setSets([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function assign(setId: string) {
    if (!slot) return;
    setAssigning(setId);
    try {
      const postsPerDay = account.posts_per_day ?? 1;
      const hours = SLOT_HOURS[postsPerDay] ?? [21];
      const slotDate = new Date(slot.date);
      slotDate.setHours(hours[slot.slotIndex] ?? 21, 0, 0, 0);

      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          channelId: account.id,
          scheduledAt: slotDate.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      onAssigned();
      onClose();
    } catch {
      // keep modal open
    } finally {
      setAssigning(null);
    }
  }

  const formattedDate = slot
    ? slot.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Assign to @{account.username} · {formattedDate}
            {(account.posts_per_day ?? 1) > 1 && ` · slot ${(slot?.slotIndex ?? 0) + 1}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No completed, unscheduled sets available.
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1">
            {(() => {
              const channelSets = sets.filter((s) => s.channel_id === account.id);
              const unassignedSets = sets.filter((s) => !s.channel_id);

              const renderCard = (s: SetCard) => {
                const thumb = s.generated_images.find((img) => img.image_url)?.image_url;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-border p-2.5"
                  >
                    <div className="h-20 w-16 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.title || "Untitled set"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={assigning === s.id}
                      onClick={() => assign(s.id)}
                      className="shrink-0 h-7 text-xs"
                    >
                      {assigning === s.id ? "Assigning…" : "Assign"}
                    </Button>
                  </div>
                );
              };

              return (
                <>
                  {channelSets.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                        Queued for @{account.username}
                      </p>
                      {channelSets.map(renderCard)}
                    </>
                  )}
                  {unassignedSets.length > 0 && (
                    <>
                      <p className={`text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 ${channelSets.length > 0 ? "mt-3" : ""}`}>
                        Unassigned
                      </p>
                      {unassignedSets.map(renderCard)}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
