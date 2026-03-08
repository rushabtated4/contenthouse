"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepIndicator } from "./step-indicator";
import { VideoInputStep } from "./video-input-step";
import { VideoTrimStep } from "./video-trim-step";
import { SnapshotStep } from "./snapshot-step";
import { ImageStep } from "./image-step";
import { VideoGenStep } from "./video-gen-step";
import { VideoResultCard } from "./video-result-card";
import { HookVideoPlayerDialog } from "./hook-video-player-dialog";
import { HookScheduleDialog } from "./hook-schedule-dialog";
import { HookVideoEditor } from "./editor/hook-video-editor";
import { useHookSession } from "@/hooks/use-hook-session";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Library, Pencil } from "lucide-react";
import type { HookSession } from "@/types/hooks";
import { toast } from "sonner";
import Link from "next/link";

interface HookCreatorWizardProps {
  sessionId?: string;
}

export function HookCreatorWizard({ sessionId: initialSessionId }: HookCreatorWizardProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);

  const { session, refetch } = useHookSession(sessionId);

  // Restore step from session status
  useEffect(() => {
    if (!session) return;
    let restoredStep = 0;

    // Clip-based sessions skip trim (Step 1) and start at Step 2
    if (session.source_type === "clip" && session.status === "draft") {
      restoredStep = 2;
    } else switch (session.status) {
      case "draft":
        restoredStep = session.snapshot_url ? 2 : session.video_url ? 1 : 0;
        break;
      case "snapshot_ready":
      case "generating_images":
      case "images_ready":
        restoredStep = 3;
        break;
      case "generating_videos":
        restoredStep = 4;
        break;
      case "completed":
        restoredStep = 5;
        break;
    }
    if (restoredStep > step) {
      setStep(restoredStep);
    }
    if (restoredStep > maxReachedStep) {
      setMaxReachedStep(restoredStep);
    }
  }, [session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceStep = useCallback((target?: number) => {
    const next = target ?? step + 1;
    setStep(next);
    setMaxReachedStep((prev) => Math.max(prev, next));
  }, [step]);

  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [editingVideoUrl, setEditingVideoUrl] = useState<string | null>(null);

  // Step 1: Create session
  const handleTiktokVideo = async (videoUrl: string, tiktokUrl: string, tiktokVideoId: string | null, stats: { playCount: number; diggCount: number; commentCount: number; shareCount: number; collectCount: number } | null) => {
    try {
      const res = await fetch("/api/hooks/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "tiktok",
          videoUrl,
          tiktokUrl,
          tiktokVideoId,
          stats,
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.id);
      router.replace(`/hooks/${data.id}`);
      advanceStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    }
  };

  const handleUploadVideo = async (videoUrl: string) => {
    try {
      const res = await fetch("/api/hooks/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType: "upload", videoUrl }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      setSessionId(data.id);
      router.replace(`/hooks/${data.id}`);
      advanceStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create session");
    }
  };

  // Step 2: Trim confirmed
  const handleTrimConfirm = async (trimStart: number, trimEnd: number, duration: number) => {
    if (!sessionId) return;
    try {
      await fetch(`/api/hooks/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trimStart, trimEnd, videoDuration: duration }),
      });
      refetch();
      advanceStep(2);

      // Auto-save trimmed clip in background (non-blocking)
      fetch(`/api/hooks/sessions/${sessionId}/trim`, { method: "POST" })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error("Clip auto-save failed:", data.error || res.statusText);
            toast.error("Clip auto-save failed: " + (data.error || res.statusText));
          } else {
            toast.success("Trimmed clip saved to library");
          }
        })
        .catch((err) => {
          console.error("Clip auto-save failed:", err);
          toast.error("Clip auto-save failed");
        });
    } catch {
      toast.error("Failed to save trim");
    }
  };

  // From Library: select a trimmed clip
  const handleSelectClip = async (sourceSession: HookSession) => {
    if (!sourceSession.trimmed_video_url) return;
    try {
      const res = await fetch("/api/hooks/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "clip",
          videoUrl: sourceSession.trimmed_video_url,
          sourceSessionId: sourceSession.id,
          videoDuration: sourceSession.trimmed_duration,
          trimStart: 0,
          trimEnd: sourceSession.trimmed_duration,
        }),
      });
      if (!res.ok) throw new Error("Failed to create session from clip");
      const data = await res.json();
      setSessionId(data.id);
      router.replace(`/hooks/${data.id}`);
      advanceStep(2); // Skip trim, go to snapshot
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to use clip");
    }
  };

  // Step results handlers
  const handleDownload = (id: string) => {
    window.open(`/api/hooks/videos/${id}/download`, "_blank");
  };

  const handleMarkUsed = async (id: string, used: boolean) => {
    try {
      await fetch(`/api/hooks/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isUsed: used }),
      });
      refetch();
    } catch {
      toast.error("Failed to update");
    }
  };

  const completedVideos = session?.hook_generated_videos?.filter(
    (v) => v.status === "completed" && v.video_url
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hook Creator</h1>
          <p className="text-sm text-muted-foreground">
            Create engaging video hooks from snapshots with AI.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/hooks/library">
            <Library className="w-4 h-4 mr-1" />
            Library
          </Link>
        </Button>
      </div>

      <StepIndicator
        currentStep={step}
        maxReachedStep={maxReachedStep}
        onStepClick={(s) => s <= maxReachedStep && setStep(s)}
      />

      {/* Step 0: Video Input */}
      {step === 0 && (
        <VideoInputStep
          onTiktokVideo={handleTiktokVideo}
          onUploadVideo={handleUploadVideo}
          onSelectClip={handleSelectClip}
        />
      )}

      {/* Step 1: Trim */}
      {step === 1 && session && (
        <VideoTrimStep
          videoUrl={session.video_url}
          initialTrimStart={session.trim_start}
          initialTrimEnd={session.trim_end ?? undefined}
          onTrimConfirm={handleTrimConfirm}
        />
      )}

      {/* Step 2: Snapshot */}
      {step === 2 && session && sessionId && (
        <SnapshotStep
          sessionId={sessionId}
          videoUrl={session.video_url}
          trimStart={session.trim_start}
          trimEnd={session.trim_end ?? session.video_duration ?? 10}
          existingSnapshot={session.snapshot_url}
          onSnapshotReady={() => {
            refetch();
            advanceStep(3);
          }}
        />
      )}

      {/* Step 3: Images (Generate + Select) */}
      {step === 3 && session && sessionId && (
        <ImageStep
          sessionId={sessionId}
          existingImages={session.hook_generated_images || []}
          onSelectionConfirmed={() => {
            refetch();
            advanceStep(4);
          }}
        />
      )}

      {/* Step 4: Generate Videos */}
      {step === 4 && session && sessionId && (
        <VideoGenStep
          sessionId={sessionId}
          existingVideos={session.hook_generated_videos || []}
          onVideosStarted={() => {
            refetch();
            advanceStep(5);
          }}
        />
      )}

      {/* Step 5: Results */}
      {step === 5 && session && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Step 6: Results</h2>
            <p className="text-sm text-muted-foreground">
              Your generated hook videos are ready. Download, schedule, or regenerate.
            </p>
          </div>

          {completedVideos.length === 0 && session.status === "generating_videos" && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Videos are still generating. This page auto-refreshes every 5 seconds.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {completedVideos.map((video) => (
              <VideoResultCard
                key={video.id}
                video={video}
                onDownload={handleDownload}
                onMarkUsed={handleMarkUsed}
                onSchedule={setSchedulingId}
                onPlay={setPlayingUrl}
                onEdit={(id, url) => {
                  setEditingVideoId(id);
                  setEditingVideoUrl(url);
                  advanceStep(6);
                }}
              />
            ))}
          </div>

          <div className="flex gap-2 justify-center pt-4">
            <Button variant="outline" onClick={() => advanceStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Generate New Images
            </Button>
            <Button variant="outline" onClick={() => setStep(0)}>
              Start New Session
            </Button>
            <Button asChild>
              <Link href="/hooks/library">
                <ArrowRight className="w-4 h-4 mr-1" />
                View Library
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Step 6: Edit & Compose */}
      {step === 6 && editingVideoId && editingVideoUrl && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Step 7: Edit & Compose</h2>
            <p className="text-sm text-muted-foreground">
              Add text overlays and attach a demo video to create a composition.
            </p>
          </div>
          <HookVideoEditor
            videoId={editingVideoId}
            videoUrl={editingVideoUrl}
            onClose={() => setStep(5)}
          />
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
        onScheduled={() => refetch()}
      />
    </div>
  );
}
