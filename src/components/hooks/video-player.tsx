"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

interface VideoPlayerProps {
  src: string;
  trimStart?: number;
  trimEnd?: number;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onLoadedMetadata?: (duration: number) => void;
}

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  seek: (time: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer({ src, trimStart = 0, trimEnd, className, onTimeUpdate, onLoadedMetadata }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      getVideoElement: () => videoRef.current,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        const time = video.currentTime;
        onTimeUpdate?.(time);

        // Loop within trim range
        if (trimEnd && time >= trimEnd) {
          video.currentTime = trimStart;
        }
      };

      const handleLoaded = () => {
        onLoadedMetadata?.(video.duration);
        if (trimStart > 0) {
          video.currentTime = trimStart;
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("loadedmetadata", handleLoaded);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleLoaded);
      };
    }, [trimStart, trimEnd, onTimeUpdate, onLoadedMetadata]);

    return (
      <video
        ref={videoRef}
        src={src}
        controls
        className={className || "w-full max-h-[400px] rounded-lg bg-black"}
        crossOrigin="anonymous"
      />
    );
  }
);
