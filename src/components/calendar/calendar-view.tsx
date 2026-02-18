"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { useScheduledEvents } from "@/hooks/use-scheduled-events";
import { useProjects } from "@/hooks/use-projects";
import { useUnscheduledSets } from "@/hooks/use-unscheduled-sets";
import { ScheduleList } from "./schedule-list";
import { UnscheduledPanel } from "./unscheduled-panel";
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
import { CalendarDays, List, Upload, PanelRight } from "lucide-react";
import { UploadPostDialog } from "./upload-post-dialog";
import { toast } from "sonner";

const FullCalendarWrapper = dynamic(
  () => import("./fullcalendar-wrapper"),
  { ssr: false }
);

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Posted", value: "posted" },
];

export function CalendarView() {
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const { events, loading, refetch } = useScheduledEvents(channelFilter, statusFilter);
  const { projects } = useProjects();
  const accounts = projects.flatMap((p) => p.project_accounts);
  const {
    sets: unscheduledSets,
    total: unscheduledTotal,
    loading: unscheduledLoading,
    refetch: refetchUnscheduled,
  } = useUnscheduledSets();

  const handleEventDrop = useCallback(
    async (setId: string, newDate: string, channelId: string | null) => {
      try {
        const res = await fetch("/api/schedule", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setId,
            scheduledAt: newDate,
            channelId,
          }),
        });

        if (!res.ok) throw new Error("Failed to reschedule");
        toast.success("Event rescheduled");
        refetch();
      } catch {
        toast.error("Failed to reschedule");
        refetch();
      }
    },
    [refetch]
  );

  const handleScheduleSet = useCallback(
    async (setId: string, scheduledAt: string, channelId?: string) => {
      try {
        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setId,
            scheduledAt,
            channelId: channelId || null,
            notes: null,
          }),
        });

        if (!res.ok) throw new Error("Failed to schedule");
        toast.success("Post scheduled");
        refetch();
        refetchUnscheduled();
      } catch {
        toast.error("Failed to schedule");
      }
    },
    [refetch, refetchUnscheduled]
  );

  const handleEventReceive = useCallback(
    (setId: string, date: string, channelId: string | null) => {
      handleScheduleSet(setId, date, channelId ?? undefined);
    },
    [handleScheduleSet]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Content Calendar
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => setPanelCollapsed((p) => !p)}
          >
            <PanelRight className="w-3.5 h-3.5" />
            Unscheduled ({unscheduledTotal})
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Post
          </Button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              size="sm"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              onClick={() => setViewMode("calendar")}
              className="rounded-none gap-1 text-xs"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="rounded-none gap-1 text-xs"
            >
              <List className="w-3.5 h-3.5" />
              List
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={statusFilter === tab.value ? "default" : "ghost"}
              onClick={() => setStatusFilter(tab.value)}
              className="text-xs"
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="w-48">
          <Select
            value={channelFilter || "all"}
            onValueChange={(v) =>
              setChannelFilter(v === "all" ? null : v)
            }
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {projects.map((project) => (
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
                  {project.project_accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      @{acc.username}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-[600px] bg-card rounded-xl border border-border flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === "calendar" ? (
            <div className="bg-card rounded-xl border border-border p-4">
              <FullCalendarWrapper
                events={events}
                onEventDrop={handleEventDrop}
                onEventReceive={handleEventReceive}
              />
            </div>
          ) : (
            <ScheduleList events={events} onRefetch={refetch} />
          )}
        </div>

        <UnscheduledPanel
          sets={unscheduledSets}
          loading={unscheduledLoading}
          accounts={accounts}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((p) => !p)}
          onSchedule={handleScheduleSet}
        />
      </div>

      <UploadPostDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          refetch();
          refetchUnscheduled();
        }}
      />
    </div>
  );
}
