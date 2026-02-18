"use client";

import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/swr/fetcher";
import type { Video, VideoAccount } from "@/types/database";

export type VideoWithCount = Video & {
  generation_count: number;
  account: VideoAccount | null;
};

export interface VideoFilters {
  appId?: string | null;
  accountId?: string | null;
  search?: string;
  minViews?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: string;
  maxGenCount?: number | null;
  minGenCount?: number | null;
}

interface UseVideosOptions {
  limit: number;
  filters?: VideoFilters;
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
  resetPages: () => void;
}

interface VideosPage {
  videos: VideoWithCount[];
  total: number;
  hasMore: boolean;
}

export function useVideos({ limit, filters }: UseVideosOptions): UseVideosReturn {
  const getKey = (pageIndex: number, previousPageData: VideosPage | null) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    const params = new URLSearchParams({
      page: (pageIndex + 1).toString(),
      limit: limit.toString(),
    });
    if (filters?.appId) params.set("app_id", filters.appId);
    if (filters?.accountId) params.set("account_id", filters.accountId);
    if (filters?.search) params.set("search", filters.search);
    if (filters?.minViews) params.set("min_views", filters.minViews.toString());
    if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters?.dateTo) params.set("date_to", filters.dateTo);
    if (filters?.sort) params.set("sort", filters.sort);
    if (filters?.maxGenCount != null)
      params.set("max_gen_count", filters.maxGenCount.toString());
    if (filters?.minGenCount != null)
      params.set("min_gen_count", filters.minGenCount.toString());
    return `/api/videos?${params}`;
  };

  const { data, size, setSize, isLoading, isValidating, error, mutate } =
    useSWRInfinite<VideosPage>(getKey, fetcher);

  const videos = data ? data.flatMap((page) => page.videos) : [];
  const total = data?.[data.length - 1]?.total ?? 0;
  const hasMore = data?.[data.length - 1]?.hasMore ?? false;
  const loadingMore = size > 1 && isValidating && !!data && data.length < size;

  const loadMore = useCallback(() => {
    setSize((s) => s + 1);
  }, [setSize]);

  const refetch = useCallback(() => {
    mutate();
  }, [mutate]);

  const resetPages = useCallback(() => {
    setSize(1);
  }, [setSize]);

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
    resetPages,
  };
}
