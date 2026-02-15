"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  tint?: string;
}

export function StatCard({ title, value, icon: Icon, tint }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-border p-4 space-y-2 transition-shadow duration-200 ease-out hover:shadow-md"
      style={{ backgroundColor: tint || "var(--card)" }}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
