"use client";

import { useCallback, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface VideoUploadZoneProps {
  onVideoReady: (videoUrl: string) => void;
}

export function VideoUploadZone({ onVideoReady }: VideoUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File too large (max 100MB)");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `source/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("hook-videos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("hook-videos").getPublicUrl(path);
      onVideoReady(publicUrl);
      toast.success("Video uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onVideoReady]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        ${uploading ? "pointer-events-none opacity-60" : ""}
      `}
    >
      <label className="cursor-pointer flex flex-col items-center gap-2">
        {uploading ? (
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {uploading ? "Uploading..." : "Drag & drop a video or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">MP4, WebM, MOV up to 100MB</p>
        <input
          type="file"
          accept="video/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
}
