"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountScheduleCard } from "@/components/accounts/account-schedule-card";
import { TodayPosts } from "@/components/accounts/today-posts";
import { usePosterOverview } from "@/hooks/use-poster-overview";

export function PostingDashboard() {
  const router = useRouter();
  const { projects, scheduledSets, loading, mutate } = usePosterOverview();

  const allAccounts = projects.flatMap((p) => p.project_accounts);

  function handleLogout() {
    document.cookie = "ch_poster=; path=/; max-age=0";
    router.push("/posting");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">ContentHouse</h1>
          <p className="text-sm text-muted-foreground">
            {allAccounts.length} assigned channel{allAccounts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </Button>
      </div>

      {/* Today's posts */}
      <TodayPosts
        scheduledSets={scheduledSets}
        allAccounts={allAccounts}
        onMutate={mutate}
      />

      {/* Channel schedule cards */}
      {projects.map((project) => (
        <div key={project.id} className="space-y-3">
          <div className="flex items-center gap-2">
            {project.color && (
              <span
                className="inline-block h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: project.color }}
              />
            )}
            <h2 className="text-sm font-medium">{project.name}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {project.project_accounts.map((account) => (
              <AccountScheduleCard
                key={account.id}
                account={account}
                scheduledSets={scheduledSets}
                onMutate={mutate}
                readOnly
              />
            ))}
          </div>
        </div>
      ))}

      {allAccounts.length === 0 && (
        <div className="rounded-lg border border-border flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">No channels assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}
