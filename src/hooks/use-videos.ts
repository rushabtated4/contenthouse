"use client";

import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/swr/fetcher";
import type { Video } from "@/types/database";

type VideoWithCount = Video & { generation_count: number };

interface UseVideosOptions {
  limit: number;
}

interface UseVideosReturn {
  videos: VideoWithCount[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

interface VideosPage {
  videos: VideoWithCount[];
  total: number;
  hasMore: boolean;
}

export function useVideos({ limit }: UseVideosOptions): UseVideosReturn {
  const getKey = (pageIndex: number, previousPageData: VideosPage | null) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const params = new URLSearchParams({
      page: (pageIndex + 1).toString(),
      limit: limit.toString(),
    });
    return `/api/videos?${params}`;
  };

  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite<VideosPage>(getKey, fetcher);

  const videos = data ? data.flatMap((page) => page.videos) : [];
  const total = data?.[data.length - 1]?.total ?? 0;
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const loadingMore = size > 1 && isValidating && !!data && data.length < size;

  const loadMore = () => {
    if (!isValidating && hasMore) {
      setSize((s) => s + 1);
    }
  };

  const refetch = () => {
    mutate();
  };

  return {
    videos,
    total,
    hasMore,
    loading: isLoading,
    loadingMore,
    error: error
      ? error instanceof Error
        ? error.message
        : "Unknown error"
      : null,
    loadMore,
    refetch,
  };
}
