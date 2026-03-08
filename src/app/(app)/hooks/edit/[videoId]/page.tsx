"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { HookVideoEditor } from "@/components/hooks/editor/hook-video-editor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function HookVideoEditorPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVideo() {
      try {
        // Fetch the hook generated video to get its URL
        const res = await fetch(`/api/hooks/library?status=completed&limit=100`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const video = data.videos?.find((v: { id: string }) => v.id === videoId);
        if (video?.video_url) {
          setVideoUrl(video.video_url);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadVideo();
  }, [videoId]);

  if (loading) {
    return <div className="container mx-auto py-6 text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (!videoUrl) {
    return (
      <div className="container mx-auto py-6 text-center space-y-4">
        <p className="text-sm text-muted-foreground">Video not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </div>
      <HookVideoEditor
        videoId={videoId}
        videoUrl={videoUrl}
        onClose={() => router.back()}
      />
    </div>
  );
}
