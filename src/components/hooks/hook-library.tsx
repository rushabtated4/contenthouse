"use client";

import { useState } from "react";
import { useHookLibrary } from "@/hooks/use-hook-library";
import { HookVideoCard } from "./hook-video-card";
import { HookVideoPlayerDialog } from "./hook-video-player-dialog";
import { HookScheduleDialog } from "./hook-schedule-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HookLibraryProps {
  embedded?: boolean;
}

export function HookLibrary({ embedded }: HookLibraryProps) {
  const [statusFilter, setStatusFilter] = useState("completed");
  const [usedFilter, setUsedFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { videos, total, hasMore, loading, refetch } = useHookLibrary({
    status: statusFilter || undefined,
    isUsed: usedFilter || undefined,
    page,
  });

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const handleDownload = (id: string) => {
    window.open(`/api/hooks/videos/${id}/download`, "_blank");
  };

  const handleMarkUsed = async (id: string, used: boolean) => {
    try {
      const res = await fetch(`/api/hooks/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUsed: used }),
      });
      if (!res.ok) throw new Error();
      toast.success(used ? "Marked as used" : "Unmarked");
      refetch();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/hooks/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Video deleted");
      refetch();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold">Hook Library</h2>
          <p className="text-sm text-muted-foreground">
            All your generated hook videos. {total} total.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Select value={usedFilter} onValueChange={setUsedFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Usage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Used</SelectItem>
            <SelectItem value="false">Unused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && videos.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hook videos yet. Create one using the wizard!
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {videos.map((video) => (
          <HookVideoCard
            key={video.id}
            video={video}
            onPlay={setPlayingUrl}
            onDownload={handleDownload}
            onMarkUsed={handleMarkUsed}
            onSchedule={setSchedulingId}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
            Load More
          </Button>
        </div>
      )}

      <HookVideoPlayerDialog
        videoUrl={playingUrl}
        open={!!playingUrl}
        onOpenChange={(open) => !open && setPlayingUrl(null)}
      />

      <HookScheduleDialog
        videoId={schedulingId}
        open={!!schedulingId}
        onOpenChange={(open) => !open && setSchedulingId(null)}
        onScheduled={refetch}
      />
    </div>
  );
}
