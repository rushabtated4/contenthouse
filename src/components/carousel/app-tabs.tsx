"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppWithAccounts } from "@/types/database";

interface AppTabsProps {
  apps: AppWithAccounts[];
  selectedAppId: string | null;
  onSelect: (appId: string | null) => void;
  loading?: boolean;
}

export function AppTabs({ apps, selectedAppId, onSelect, loading }: AppTabsProps) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
          selectedAppId === null
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All Apps
      </button>
      {apps.map((app) => (
        <button
          key={app.id}
          onClick={() => onSelect(app.id)}
          className={cn(
            "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-2",
            selectedAppId === app.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {app.color && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: app.color }}
            />
          )}
          {app.name}
          <span className="text-xs opacity-70">({app.accounts?.length || 0})</span>
        </button>
      ))}
    </div>
  );
}
