"use client";

import Link from "next/link";
import { useDashboardStats } from "@/hooks/use-dashboard-stats";
import { StatCard } from "./stat-card";
import { RecentActivity } from "./recent-activity";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  FolderCheck,
  ImageIcon,
  CircleCheckBig,
  Send,
  ArrowRight,
} from "lucide-react";

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Page title + action button like reference */}
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

      {/* 4 stat cards in a row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Generation Sets"
          value={stats.totalSets.toLocaleString()}
          icon={FolderCheck}
        />
        <StatCard
          title="Images Generated"
          value={stats.totalImages.toLocaleString()}
          icon={ImageIcon}
          tint="#FFF2EA"
        />
        <StatCard
          title="Completed"
          value={stats.completedSets.toLocaleString()}
          icon={CircleCheckBig}
          tint="#F0F9F4"
        />
        <StatCard
          title="Posted"
          value={stats.postedSets.toLocaleString()}
          icon={Send}
          tint="#FEF2F2"
        />
      </div>

      {/* Recent activity table */}
      <RecentActivity sets={stats.recentSets} />
    </div>
  );
}
