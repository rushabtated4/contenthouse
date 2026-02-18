"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProjectAccount } from "@/types/database";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  account: ProjectAccount;
  onSave: (account: ProjectAccount) => void;
  onCancel: () => void;
}

export function ScheduleConfigEditor({ account, onSave, onCancel }: Props) {
  const [days, setDays] = useState<number[]>(
    account.days_of_week ?? [1, 2, 3, 4, 5]
  );
  const [perDay, setPerDay] = useState<number>(account.posts_per_day ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/project-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          days_of_week: days,
          posts_per_day: perDay,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      onSave(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-2">
      <div className="flex gap-1">
        {DAY_LABELS.map((label, i) => (
          <button
            key={i}
            title={DAY_FULL[i]}
            onClick={() => toggleDay(i)}
            className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
              days.includes(i)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">posts/day:</span>
        <Input
          type="number"
          min={1}
          max={3}
          value={perDay}
          onChange={(e) => setPerDay(Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
          className="h-7 w-14 text-xs"
        />
      </div>

      {error && <span className="text-xs text-destructive">{error}</span>}

      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs px-2">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs px-2">
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
