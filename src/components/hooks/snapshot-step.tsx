"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SnapshotCapture } from "./snapshot-capture";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SnapshotStepProps {
  sessionId: string;
  videoUrl: string;
  trimStart: number;
  trimEnd: number;
  existingSnapshot?: string | null;
  onSnapshotReady: () => void;
}

export function SnapshotStep({
  sessionId,
  videoUrl,
  trimStart,
  trimEnd,
  existingSnapshot,
  onSnapshotReady,
}: SnapshotStepProps) {
  const [uploading, setUploading] = useState(false);
  const [capturedData, setCapturedData] = useState<{ imageData: string; timestamp: number } | null>(null);

  const handleCapture = (imageData: string, timestamp: number) => {
    setCapturedData({ imageData, timestamp });
  };

  const handleUploadSnapshot = async () => {
    if (!capturedData) return;
    setUploading(true);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: capturedData.imageData,
          timestamp: capturedData.timestamp,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to upload snapshot");
      }

      toast.success("Snapshot saved");
      onSnapshotReady();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save snapshot");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 3: Capture Snapshot</h2>
        <p className="text-sm text-muted-foreground">
          Scrub through the video and capture a frame to use as the image generation reference.
        </p>
      </div>

      {existingSnapshot && !capturedData && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Current snapshot:</p>
          <img src={existingSnapshot} alt="Current snapshot" className="w-full max-h-[300px] rounded-lg object-contain bg-black" />
        </div>
      )}

      <SnapshotCapture
        videoUrl={videoUrl}
        trimStart={trimStart}
        trimEnd={trimEnd}
        onCapture={handleCapture}
      />

      {capturedData && (
        <div className="flex justify-end">
          <Button onClick={handleUploadSnapshot} disabled={uploading}>
            {uploading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Save Snapshot & Continue
          </Button>
        </div>
      )}

      {existingSnapshot && !capturedData && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onSnapshotReady}>
            Use Existing Snapshot
          </Button>
        </div>
      )}
    </div>
  );
}
