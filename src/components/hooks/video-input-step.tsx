"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiktokUrlInput } from "./tiktok-url-input";
import { VideoUploadZone } from "./video-upload-zone";
import { TrimmedClipLibrary } from "./trimmed-clip-library";
import type { HookSession } from "@/types/hooks";

interface VideoInputStepProps {
  onTiktokVideo: (videoUrl: string, tiktokUrl: string, tiktokVideoId: string | null, stats: { playCount: number; diggCount: number; commentCount: number; shareCount: number; collectCount: number } | null) => void;
  onUploadVideo: (videoUrl: string) => void;
  onSelectClip: (session: HookSession) => void;
}

export function VideoInputStep({ onTiktokVideo, onUploadVideo, onSelectClip }: VideoInputStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 1: Add a Video</h2>
        <p className="text-sm text-muted-foreground">
          Paste a TikTok URL, upload a video file, or select a previously trimmed clip.
        </p>
      </div>

      <Tabs defaultValue="tiktok">
        <TabsList>
          <TabsTrigger value="tiktok">TikTok URL</TabsTrigger>
          <TabsTrigger value="upload">Upload Video</TabsTrigger>
          <TabsTrigger value="library">From Library</TabsTrigger>
        </TabsList>

        <TabsContent value="tiktok" className="mt-4">
          <TiktokUrlInput onVideoReady={onTiktokVideo} />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <VideoUploadZone onVideoReady={onUploadVideo} />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <TrimmedClipLibrary onSelectClip={onSelectClip} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
