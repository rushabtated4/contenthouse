"use client";

import { useEffect, useRef, useState } from "react";
import { Draggable } from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GripVertical,
  CalendarPlus,
  PanelRightClose,
  PanelRightOpen,
  Image as ImageIcon,
} from "lucide-react";
import type { GenerationSetWithVideo } from "@/types/api";
import type { ProjectAccount } from "@/types/database";

interface UnscheduledPanelProps {
  sets: GenerationSetWithVideo[];
  loading: boolean;
  accounts: ProjectAccount[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSchedule: (
    setId: string,
    scheduledAt: string,
    channelId?: string
  ) => Promise<void>;
}

function SchedulePopover({
  setId,
  accounts,
  onSchedule,
}: {
  setId: string;
  accounts: ProjectAccount[];
  onSchedule: UnscheduledPanelProps["onSchedule"];
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [channelId, setChannelId] = useState("none");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!date) return;
    setSubmitting(true);
    try {
      await onSchedule(
        setId,
        new Date(date).toISOString(),
        channelId !== "none" ? channelId : undefined
      );
      setOpen(false);
      setDate("");
      setChannelId("none");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0">
          <CalendarPlus className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-64 space-y-3">
        <p className="text-sm font-medium">Schedule Post</p>
        <div className="space-y-2">
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs"
          />
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No channel</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          className="w-full text-xs"
          disabled={!date || submitting}
          onClick={handleConfirm}
        >
          {submitting ? "Scheduling..." : "Confirm"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function getItemLabel(set: GenerationSetWithVideo): string {
  if (set.title) return set.title;
  if (set.videos?.description) return set.videos.description.slice(0, 60);
  return "Carousel";
}

function getCompletedCount(set: GenerationSetWithVideo): number {
  return set.generated_images.filter((i) => i.status === "completed").length;
}

function getFirstThumbnail(set: GenerationSetWithVideo): string | null {
  const completed = set.generated_images.find(
    (i) => i.status === "completed" && i.image_url
  );
  return completed?.image_url ?? null;
}

export function UnscheduledPanel({
  sets,
  loading,
  accounts,
  collapsed,
  onToggleCollapse,
  onSchedule,
}: UnscheduledPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (collapsed || !containerRef.current) return;

    const draggable = new Draggable(containerRef.current, {
      itemSelector: ".fc-unscheduled-item",
      eventData: (el) => {
        return {
          title: el.getAttribute("data-title") || "Carousel",
          duration: { days: 1 },
          extendedProps: {
            setId: el.getAttribute("data-set-id"),
            videoId: el.getAttribute("data-video-id") || null,
          },
        };
      },
    });

    return () => {
      draggable.destroy();
    };
  }, [collapsed, sets]);

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 bg-card border border-border rounded-xl flex flex-col items-center pt-3">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 mb-3"
          onClick={onToggleCollapse}
        >
          <PanelRightOpen className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground font-medium [writing-mode:vertical-lr] rotate-180">
          Unscheduled ({sets.length})
        </span>
      </div>
    );
  }

  return (
    <div className="w-[280px] shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          Unscheduled ({sets.length})
        </h3>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onToggleCollapse}
        >
          <PanelRightClose className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 max-h-[600px]">
        <div ref={containerRef} className="p-2 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              No unscheduled sets
            </p>
          ) : (
            sets.map((set) => {
              const thumb = getFirstThumbnail(set);
              const count = getCompletedCount(set);
              const label = getItemLabel(set);

              return (
                <div
                  key={set.id}
                  className="fc-unscheduled-item flex items-center gap-2 p-2 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors"
                  data-set-id={set.id}
                  data-title={label}
                  data-video-id={set.video_id || ""}
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />

                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="w-9 h-11 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-11 rounded bg-muted flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground break-words">
                      {label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {count} slide{count !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <SchedulePopover
                    setId={set.id}
                    accounts={accounts}
                    onSchedule={onSchedule}
                  />
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
