"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { GenerationSetWithVideo } from "@/types/api";

interface UseGeneratedSetsOptions {
  status: string;
  reviewStatus?: string;
  sort: string;
  page: number;
  limit: number;
}

interface UseGeneratedSetsReturn {
  sets: GenerationSetWithVideo[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  refetch: () => void;
}

export function useGeneratedSets({
  status,
  reviewStatus,
  sort,
  page,
  limit,
}: UseGeneratedSetsOptions): UseGeneratedSetsReturn {
  const params = new URLSearchParams({
    status,
    sort,
    page: page.toString(),
    limit: limit.toString(),
  });
  if (reviewStatus && reviewStatus !== "all") {
    params.set("review_status", reviewStatus);
  }
  const key = `/api/generation-sets?${params}`;

  const { data, isLoading, mutate } = useSWR<{
    sets: GenerationSetWithVideo[];
    total: number;
    hasMore: boolean;
  }>(key, fetcher);

  return {
    sets: data?.sets ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    loading: isLoading,
    refetch: mutate,
  };
}
