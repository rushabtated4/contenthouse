"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/use-projects";
import { CalendarDays, Save, CheckCircle, Undo2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleControlsProps {
  setId: string;
  initialChannelId?: string | null;
  initialScheduledAt?: string | null;
  initialPostedAt?: string | null;
}

export function ScheduleControls({
  setId,
  initialChannelId,
  initialScheduledAt,
  initialPostedAt,
}: ScheduleControlsProps) {
  const { projects } = useProjects();
  const [channelId, setChannelId] = useState(initialChannelId || "");
  const [scheduledAt, setScheduledAt] = useState(
    initialScheduledAt
      ? new Date(initialScheduledAt).toISOString().slice(0, 16)
      : ""
  );
  const [saving, setSaving] = useState(false);
  const [postedAt, setPostedAt] = useState<string | null>(initialPostedAt || null);
  const [markingPosted, setMarkingPosted] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          channelId: channelId || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          notes: null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save schedule");
      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePosted = async () => {
    setMarkingPosted(true);
    const newPosted = !postedAt;
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, posted: newPosted }),
      });

      if (!res.ok) throw new Error("Failed to update posted status");
      const data = await res.json();
      setPostedAt(data.posted_at);
      toast.success(newPosted ? "Marked as posted" : "Unmarked as posted");
    } catch {
      toast.error("Failed to update posted status");
    } finally {
      setMarkingPosted(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Channel
          </label>
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select channel..." />
            </SelectTrigger>
            <SelectContent>
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
                      {acc.nickname ? ` (${acc.nickname})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Post Date/Time
          </label>
          <div className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {(scheduledAt || postedAt) && (
        <div className="flex items-center gap-2">
          {postedAt && (
            <Badge className="bg-green-600 hover:bg-green-700 text-xs gap-1">
              <CheckCircle className="w-3 h-3" />
              Posted
            </Badge>
          )}
          <Button
            size="sm"
            variant={postedAt ? "ghost" : "outline"}
            onClick={handleTogglePosted}
            disabled={markingPosted}
            className="gap-1.5 text-xs h-7"
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
      )}
    </div>
  );
}
