"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { ProjectWithAccounts } from "@/types/database";

export function useProjects() {
  const { data, isLoading } = useSWR<ProjectWithAccounts[]>(
    "/api/projects",
    fetcher
  );

  return { projects: data ?? [], loading: isLoading };
}
