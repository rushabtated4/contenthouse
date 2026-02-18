"use client";

import { FolderOpen, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountScheduleCard } from "./account-schedule-card";
import { useAccountOverview, computeSlots } from "@/hooks/use-account-overview";

export function AccountList() {
  const { projects, scheduledSets, loading, mutate } = useAccountOverview();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalAccounts = projects.reduce(
    (sum, p) => sum + p.project_accounts.length,
    0
  );

  const allAccounts = projects.flatMap((p) => p.project_accounts);
  const totalScheduled = scheduledSets.filter(
    (s) => s.scheduled_at && !s.posted_at
  ).length;
  const totalEmpty = allAccounts.reduce((sum, a) => {
    const slots = computeSlots(a, scheduledSets);
    return sum + slots.filter((s) => s.status === "empty").length;
  }, 0);
  const accountsWithEmpty = allAccounts.filter((a) => {
    const slots = computeSlots(a, scheduledSets);
    return slots.some((s) => s.status === "empty");
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">
          Accounts{" "}
          <span className="text-muted-foreground font-normal">
            ({totalAccounts})
          </span>
        </h1>
        {accountsWithEmpty > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 rounded-full px-2.5 py-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {accountsWithEmpty} account{accountsWithEmpty !== 1 ? "s" : ""} have empty slots
          </span>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex gap-6 text-sm text-muted-foreground border border-border rounded-lg px-4 py-3 bg-muted/20">
        <span>
          <span className="font-semibold text-foreground">{totalAccounts}</span> accounts
        </span>
        <span>
          <span className="font-semibold text-foreground">{totalScheduled}</span> upcoming posts
        </span>
        <span className={totalEmpty > 0 ? "text-orange-600 dark:text-orange-400" : ""}>
          <span className="font-semibold">{totalEmpty}</span> empty{" "}
          {totalEmpty === 1 ? "slot" : "slots"} in next 2 weeks
        </span>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border flex flex-col items-center justify-center py-10 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No projects found.</p>
        </div>
      ) : (
        projects.map((project) => (
          <div key={project.id} className="space-y-3">
            {/* Project header */}
            <div className="flex items-center gap-2">
              {project.color && (
                <span
                  className="inline-block h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <h2 className="text-sm font-medium">{project.name}</h2>
              <span className="text-xs text-muted-foreground">
                ({project.project_accounts.length})
              </span>
            </div>

            {project.project_accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-5">
                No accounts in this project.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {project.project_accounts.map((account) => (
                  <AccountScheduleCard
                    key={account.id}
                    account={account}
                    scheduledSets={scheduledSets}
                    onMutate={mutate}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
