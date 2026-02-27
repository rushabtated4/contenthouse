"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { HookLibraryResponse } from "@/types/hooks";

export function useHookLibrary(filters?: {
  status?: string;
  channelId?: string;
  isUsed?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.channelId) params.set("channelId", filters.channelId);
  if (filters?.isUsed) params.set("isUsed", filters.isUsed);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const key = qs ? `/api/hooks/library?${qs}` : "/api/hooks/library";

  const { data, isLoading, mutate } = useSWR<HookLibraryResponse>(key, fetcher);

  return {
    videos: data?.videos ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    hasMore: data?.hasMore ?? false,
    loading: isLoading,
    refetch: mutate,
  };
}
