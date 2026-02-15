"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { StatsResponse } from "@/types/api";

export function useDashboardStats() {
  const { data, isLoading, mutate } = useSWR<StatsResponse>(
    "/api/stats",
    fetcher
  );

  return { stats: data ?? null, loading: isLoading, refetch: mutate };
}
