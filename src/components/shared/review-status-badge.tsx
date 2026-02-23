"use client";

import { useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface ReviewStatusBadgeProps {
  setId: string;
  reviewStatus: "unverified" | "ready_to_post";
  onToggled?: () => void;
}

export function ReviewStatusBadge({ setId, reviewStatus, onToggled }: ReviewStatusBadgeProps) {
  const [updating, setUpdating] = useState(false);
  const isReady = reviewStatus === "ready_to_post";

  async function toggle() {
    setUpdating(true);
    try {
      const newStatus = isReady ? "unverified" : "ready_to_post";
      const res = await fetch("/api/generation-sets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId, review_status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      onToggled?.();
    } catch {
      toast.error("Failed to update review status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      disabled={updating}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
        isReady
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      } ${updating ? "opacity-50" : ""}`}
    >
      {isReady ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Circle className="w-3 h-3" />
      )}
      {isReady ? "Ready" : "Unverified"}
    </button>
  );
}
