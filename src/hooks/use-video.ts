"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { VideoWithSets } from "@/types/database";

export function useVideo(videoId: string | null) {
  const { data, isLoading, error, mutate } = useSWR<VideoWithSets>(
    videoId ? `/api/videos/${videoId}` : null,
    fetcher
  );

  return {
    video: data ?? null,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Unknown error") : null,
    refetch: mutate,
  };
}
