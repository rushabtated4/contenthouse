"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepIndicator } from "./step-indicator";
import { VideoInputStep } from "./video-input-step";
import { VideoTrimStep } from "./video-trim-step";
import { SnapshotStep } from "./snapshot-step";
import { ImageGenStep } from "./image-gen-step";
import { ImageSelectStep } from "./image-select-step";
import { VideoGenStep } from "./video-gen-step";
import { VideoResultCard } from "./video-result-card";
import { HookVideoPlayerDialog } from "./hook-video-player-dialog";
import { HookScheduleDialog } from "./hook-schedule-dialog";
import { useHookSession } from "@/hooks/use-hook-session";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Library } from "lucide-react";
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
    switch (session.status) {
      case "draft":
        restoredStep = session.snapshot_url ? 2 : session.video_url ? 1 : 0;
        break;
      case "snapshot_ready":
        restoredStep = 3;
        break;
      case "generating_images":
        restoredStep = 3;
        break;
      case "images_ready":
        restoredStep = 4;
        break;
      case "generating_videos":
        restoredStep = 5;
        break;
      case "completed":
        restoredStep = 6;
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

  // Step 1: Create session
  const handleTiktokVideo = async (videoUrl: string, tiktokUrl: string, tiktokVideoId: string | null) => {
    try {
      const res = await fetch("/api/hooks/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "tiktok",
          videoUrl,
          tiktokUrl,
          tiktokVideoId,
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
    } catch {
      toast.error("Failed to save trim");
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

      {/* Step 3: Generate Images */}
      {step === 3 && session && sessionId && (
        <ImageGenStep
          sessionId={sessionId}
          existingImages={session.hook_generated_images || []}
          onImagesReady={() => {
            refetch();
            advanceStep(4);
          }}
        />
      )}

      {/* Step 4: Select Images */}
      {step === 4 && session && sessionId && (
        <ImageSelectStep
          sessionId={sessionId}
          images={session.hook_generated_images || []}
          onSelectionConfirmed={() => {
            refetch();
            advanceStep(5);
          }}
        />
      )}

      {/* Step 5: Generate Videos */}
      {step === 5 && session && sessionId && (
        <VideoGenStep
          sessionId={sessionId}
          existingVideos={session.hook_generated_videos || []}
          onVideosStarted={() => {
            refetch();
            advanceStep(6);
          }}
        />
      )}

      {/* Step 6: Results */}
      {step === 6 && session && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Step 7: Results</h2>
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
