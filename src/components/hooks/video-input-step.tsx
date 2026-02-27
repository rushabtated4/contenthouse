"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiktokUrlInput } from "./tiktok-url-input";
import { VideoUploadZone } from "./video-upload-zone";

interface VideoInputStepProps {
  onTiktokVideo: (videoUrl: string, tiktokUrl: string, tiktokVideoId: string | null) => void;
  onUploadVideo: (videoUrl: string) => void;
}

export function VideoInputStep({ onTiktokVideo, onUploadVideo }: VideoInputStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 1: Add a Video</h2>
        <p className="text-sm text-muted-foreground">
          Paste a TikTok URL or upload a video file to get started.
        </p>
      </div>

      <Tabs defaultValue="tiktok">
        <TabsList>
          <TabsTrigger value="tiktok">TikTok URL</TabsTrigger>
          <TabsTrigger value="upload">Upload Video</TabsTrigger>
        </TabsList>

        <TabsContent value="tiktok" className="mt-4">
          <TiktokUrlInput onVideoReady={onTiktokVideo} />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <VideoUploadZone onVideoReady={onUploadVideo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
