"use client";

import { useGenerationProgress } from "@/hooks/use-generation-progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface GenerationProgressProps {
  batchId: string | null;
  error?: string | null;
}

export function GenerationProgress({ batchId, error }: GenerationProgressProps) {
  const { sets, images, totalImages, completedImages, progressPercent, isComplete } =
    useGenerationProgress(batchId);

  // Show error banner if generation failed to even start
  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          <h3 className="text-sm font-medium text-destructive">
            Generation Failed
          </h3>
        </div>
        <p className="text-sm text-destructive/80 pl-7">{error}</p>
        {error.toLowerCase().includes("billing") && (
          <p className="text-xs text-muted-foreground pl-7">
            Check your OpenAI API key and billing limits at{" "}
            <a
              href="https://platform.openai.com/settings/organization/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              platform.openai.com
            </a>
          </p>
        )}
      </div>
    );
  }

  if (!batchId || sets.length === 0) return null;

  const failedImages = images.filter((i) => i.status === "failed");
  const hasFailures = failedImages.length > 0;
  const allFailed = sets.every((s) => s.status === "failed");

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        allFailed
          ? "border-destructive/30 bg-destructive/5"
          : hasFailures
            ? "border-accent/30 bg-accent/5"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            allFailed ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-primary" />
            )
          ) : (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          )}
          <h3 className="text-sm font-medium text-foreground">
            {isComplete
              ? allFailed
                ? "Generation Failed"
                : hasFailures
                  ? "Generation Completed (with errors)"
                  : "Generation Complete"
              : "Generating..."}
          </h3>
        </div>
        <Badge
          variant={
            allFailed ? "destructive" : isComplete ? "default" : "secondary"
          }
        >
          {isComplete
            ? allFailed
              ? "Failed"
              : `${completedImages - failedImages.length}/${totalImages} done`
            : `${progressPercent}%`}
        </Badge>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
            allFailed ? "bg-destructive" : hasFailures ? "bg-accent" : "bg-primary"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {completedImages} / {totalImages} images
        </span>
        <span>{sets.length} set{sets.length > 1 ? "s" : ""}</span>
      </div>

      {/* Per-set progress */}
      <div className="space-y-2">
        {sets.map((set) => (
          <div key={set.id} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-14">
              Set {set.set_index + 1}
            </span>
            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  set.status === "failed"
                    ? "bg-destructive"
                    : set.status === "partial"
                      ? "bg-accent"
                      : "bg-primary"
                }`}
                style={{
                  width: `${set.progress_total > 0 ? (set.progress_current / set.progress_total) * 100 : 0}%`,
                }}
              />
            </div>
            <Badge
              variant={
                set.status === "failed"
                  ? "destructive"
                  : set.status === "partial"
                    ? "secondary"
                    : "outline"
              }
              className="text-[10px] px-1.5 py-0"
            >
              {set.status}
            </Badge>
          </div>
        ))}
      </div>

      {/* Show failed image errors */}
      {hasFailures && isComplete && (
        <div className="space-y-1.5 pt-1 border-t border-border">
          <p className="text-xs font-medium text-destructive">
            {failedImages.length} image{failedImages.length > 1 ? "s" : ""} failed:
          </p>
          {failedImages.slice(0, 5).map((img) => (
            <p key={img.id} className="text-xs text-muted-foreground pl-2">
              Slide {img.slide_index + 1}: {img.error_message || "Unknown error"}
            </p>
          ))}
          {failedImages.length > 5 && (
            <p className="text-xs text-muted-foreground pl-2">
              ...and {failedImages.length - 5} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
