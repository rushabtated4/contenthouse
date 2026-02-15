"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";
import type { ProjectAccountWithProject } from "@/types/database";

export function useProjectAccounts() {
  const { data, isLoading } = useSWR<ProjectAccountWithProject[]>(
    "/api/project-accounts",
    fetcher
  );

  return { accounts: data ?? [], loading: isLoading };
}
