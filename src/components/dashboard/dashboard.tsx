"use client";

import Link from "next/link";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { StatCard } from "./stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FolderCheck,
  CircleCheckBig,
  Send,
  Clock,
  CalendarX,
  ArrowRight,
  User,
} from "lucide-react";
import type { AccountStat } from "@/types/api";

function AccountStatsTable({ accounts }: { accounts: AccountStat[] }) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No account data yet. Assign carousels to channels to see per-account
        stats.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
              Account
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
              Total
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
              Completed
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
              Scheduled
            </th>
            <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">
              Posted
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a, i) => (
            <tr
              key={a.id}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">
                    {a.nickname || a.username}
                  </span>
                  {a.nickname && (
                    <span className="text-muted-foreground text-xs">
                      @{a.username}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {a.totalSets}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">
                {a.completedSets}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-orange-500">
                {a.scheduledSets}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-rose-500">
                {a.postedSets}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Dashboard() {
  const { stats, loading } = useDashboardStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72 mt-1.5" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            ContentHouse dashboard
          </p>
        </div>
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/generated">
            View Generated
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {/* 5 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Generation Sets"
          value={stats.totalSets.toLocaleString()}
          icon={FolderCheck}
        />
        <StatCard
          title="Generated Carousels"
          value={stats.completedSets.toLocaleString()}
          icon={CircleCheckBig}
          tint="#F0F9F4"
        />
        <StatCard
          title="Pending"
          value={stats.pendingSets.toLocaleString()}
          icon={Clock}
          tint="#FFF8EC"
        />
        <StatCard
          title="Unscheduled"
          value={stats.unscheduledSets.toLocaleString()}
          icon={CalendarX}
          tint="#F5F3FF"
        />
        <StatCard
          title="Posted"
          value={stats.postedSets.toLocaleString()}
          icon={Send}
          tint="#FEF2F2"
        />
      </div>

      {/* Per-account breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">
          By Account
        </h2>
        <AccountStatsTable accounts={stats.accountStats} />
      </div>
    </div>
  );
}
