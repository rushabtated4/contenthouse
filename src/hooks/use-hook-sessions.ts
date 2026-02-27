"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { HookSession } from "@/types/hooks";

interface SessionsResponse {
  sessions: HookSession[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function useHookSessions(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const qs = params.toString();
  const key = qs ? `/api/hooks/sessions?${qs}` : "/api/hooks/sessions";

  const { data, isLoading, mutate } = useSWR<SessionsResponse>(key, fetcher);

  return {
    sessions: data?.sessions ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    refetch: mutate,
  };
}
