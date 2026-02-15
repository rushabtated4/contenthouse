"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { GenerationSetWithVideo } from "@/types/api";

interface UseUnscheduledSetsReturn {
  sets: GenerationSetWithVideo[];
  total: number;
  loading: boolean;
  refetch: () => void;
}

export function useUnscheduledSets(): UseUnscheduledSetsReturn {
  const key =
    "/api/generation-sets?status=completed,partial&scheduled=false&sort=newest&limit=50";

  const { data, isLoading, mutate } = useSWR<{
    sets: GenerationSetWithVideo[];
    total: number;
  }>(key, fetcher);

  return {
    sets: data?.sets ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    refetch: mutate,
  };
}
