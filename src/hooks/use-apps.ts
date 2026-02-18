"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { AppWithAccounts } from "@/types/database";

interface UseAppsReturn {
  apps: AppWithAccounts[];
  loading: boolean;
  error: string | null;
}

export function useApps(): UseAppsReturn {
  const { data, isLoading, error } = useSWR<{ apps: AppWithAccounts[] }>(
    "/api/apps",
    fetcher
  );

  return {
    apps: data?.apps || [],
    loading: isLoading,
    error: error
      ? error instanceof Error
        ? error.message
        : "Unknown error"
      : null,
  };
}
