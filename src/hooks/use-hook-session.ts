"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { HookSessionWithRelations } from "@/types/hooks";

export function useHookSession(sessionId: string | null) {
  const { data, isLoading, mutate } = useSWR<HookSessionWithRelations>(
    sessionId ? `/api/hooks/sessions/${sessionId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  return {
    session: data ?? null,
    loading: isLoading,
    refetch: mutate,
  };
}
