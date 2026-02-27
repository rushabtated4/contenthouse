"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface TiktokUrlInputProps {
  onVideoReady: (videoUrl: string, tiktokUrl: string, tiktokVideoId: string | null) => void;
}

export function TiktokUrlInput({ onVideoReady }: TiktokUrlInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/hooks/tiktok-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch video");
      }

      const data = await res.json();
      onVideoReady(data.videoUrl, url.trim(), data.tiktokVideoId);
      toast.success("Video downloaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="https://www.tiktok.com/@user/video/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          className="pl-9"
          disabled={loading}
        />
      </div>
      <Button onClick={handleFetch} disabled={loading || !url.trim()}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch Video"}
      </Button>
    </div>
  );
}
