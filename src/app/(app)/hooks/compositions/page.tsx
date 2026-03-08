"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompositionScheduleDialog } from "@/components/hooks/composition-schedule-dialog";
import { HookVideoPlayerDialog } from "@/components/hooks/hook-video-player-dialog";
import { Play, Calendar, Trash2, Pencil, Video, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { HookCompositionWithRelations } from "@/types/hook-editor";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

export default function CompositionsPage() {
  const [compositions, setCompositions] = useState<HookCompositionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  const loadCompositions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/hooks/compositions?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCompositions(data.compositions || []);
    } catch {
      setCompositions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadCompositions(); }, [loadCompositions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this composition?")) return;
    try {
      const res = await fetch(`/api/hooks/compositions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Composition deleted");
      loadCompositions();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleToggleReview = async (id: string, current: string) => {
    try {
      const newStatus = current === "ready_to_post" ? "unverified" : "ready_to_post";
      await fetch(`/api/hooks/compositions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: newStatus }),
      });
      loadCompositions();
    } catch {
      toast.error("Failed to update");
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-3 h-3 text-green-500" />;
      case "failed": return <AlertCircle className="w-3 h-3 text-destructive" />;
      case "rendering": return <Loader2 className="w-3 h-3 animate-spin" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compositions</h1>
          <p className="text-sm text-muted-foreground">
            Edited hook videos with text overlays and demo clips.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : compositions.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Video className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No compositions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Edit a hook video to create a composition.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {compositions.map((comp) => (
            <Card key={comp.id} className="overflow-hidden">
              <div
                className="relative aspect-[9/16] max-h-[250px] bg-black cursor-pointer group"
                onClick={() => {
                  const url = comp.rendered_video_url || comp.hook_generated_videos?.video_url;
                  if (url) setPlayingUrl(url);
                }}
              >
                {comp.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={comp.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    {statusIcon(comp.status)}
                    {comp.status}
                  </Badge>
                  {comp.review_status === "ready_to_post" && (
                    <Badge className="bg-green-500 text-[10px]">Ready</Badge>
                  )}
                  {comp.scheduled_at && (
                    <Badge variant="outline" className="text-[10px]">
                      {format(new Date(comp.scheduled_at), "MMM d")}
                    </Badge>
                  )}
                  {comp.posted_at && <Badge className="bg-green-500 text-[10px]">Posted</Badge>}
                  {comp.demo_video_id && (
                    <Badge variant="outline" className="text-[10px]">+ Demo</Badge>
                  )}
                </div>

                {comp.notes && (
                  <p className="text-xs text-muted-foreground truncate">{comp.notes}</p>
                )}

                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(comp.created_at), "MMM d, yyyy")}
                </p>

                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="outline" className="h-6 w-6 p-0" asChild>
                    <Link href={`/hooks/edit/${comp.source_video_id}`}>
                      <Pencil className="w-3 h-3" />
                    </Link>
                  </Button>
                  {comp.status === "completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-6 p-0"
                      onClick={() => handleToggleReview(comp.id, comp.review_status)}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => setSchedulingId(comp.id)}
                  >
                    <Calendar className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => handleDelete(comp.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <HookVideoPlayerDialog
        videoUrl={playingUrl}
        open={!!playingUrl}
        onOpenChange={(open) => !open && setPlayingUrl(null)}
      />

      <CompositionScheduleDialog
        compositionId={schedulingId}
        open={!!schedulingId}
        onOpenChange={(open) => !open && setSchedulingId(null)}
        onScheduled={loadCompositions}
      />
    </div>
  );
}
