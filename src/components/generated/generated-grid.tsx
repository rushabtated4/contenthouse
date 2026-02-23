"use client";

import { useState } from "react";
import Link from "next/link";
import { useGeneratedSets } from "@/hooks/use-generated-sets";
import { GeneratedSetCard } from "./generated-set-card";
import { AssignChannelModal } from "./assign-channel-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, List, Trash2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ReviewStatusBadge } from "@/components/shared/review-status-badge";
import type { GenerationSetWithVideo } from "@/types/api";

const REVIEW_TABS = [
  { label: "All", value: "all" },
  { label: "Unverified", value: "unverified" },
  { label: "Ready to post", value: "ready_to_post" },
];

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Partial", value: "partial" },
  { label: "Failed", value: "failed" },
  { label: "Queued", value: "queued" },
];

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "partial":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    case "processing":
    case "queued":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSchedule(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface TableViewProps {
  sets: GenerationSetWithVideo[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  refetch: () => void;
  onAssign: (set: GenerationSetWithVideo) => void;
}

function TableView({ sets, selected, onToggle, onToggleAll, refetch, onAssign }: TableViewProps) {
  async function handleDelete(id: string) {
    if (!confirm("Delete this generation set?")) return;
    await fetch(`/api/generation-sets/${id}`, { method: "DELETE" });
    refetch();
  }

  const allSelected = sets.length > 0 && sets.every((s) => selected.has(s.id));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="px-3 py-2.5 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="rounded border-border"
              />
            </th>
            <th className="text-left font-medium px-4 py-2.5">Description</th>
            <th className="text-center font-medium px-3 py-2.5">Slides</th>
            <th className="text-center font-medium px-3 py-2.5">Status</th>
            <th className="text-center font-medium px-3 py-2.5">Review</th>
            <th className="text-center font-medium px-3 py-2.5">Account</th>
            <th className="text-center font-medium px-3 py-2.5">Schedule</th>
            <th className="text-right font-medium px-4 py-2.5">Created</th>
            <th className="px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => {
            const completedImages = set.generated_images.filter(
              (i) => i.status === "completed"
            );
            const firstImage = completedImages.sort(
              (a, b) => a.slide_index - b.slide_index
            )[0];
            const description = set.videos?.description || set.title;
            const videoId = set.videos?.id || set.video_id;
            const isChecked = selected.has(set.id);

            const cellContent = (
              <div className="flex items-center gap-3">
                {firstImage?.image_url ? (
                  <img
                    src={firstImage.image_url}
                    alt=""
                    className="w-8 h-8 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-muted shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate max-w-[250px]">
                  {description?.slice(0, 60) || "Untitled carousel"}
                </span>
              </div>
            );

            return (
              <tr
                key={set.id}
                className={`group border-b border-border last:border-0 hover:bg-warm/50 transition-colors duration-150 ease-out ${isChecked ? "bg-primary/5" : ""}`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(set.id)}
                    className="rounded border-border"
                  />
                </td>
                <td className="px-4 py-2.5">
                  {videoId ? (
                    <Link
                      href={`/generate/${videoId}`}
                      className="flex items-center gap-3"
                    >
                      {cellContent}
                    </Link>
                  ) : (
                    cellContent
                  )}
                </td>
                <td className="text-center px-3 py-2.5">
                  <span className="text-sm text-foreground">
                    {completedImages.length}
                    <span className="text-muted-foreground">/{set.progress_total}</span>
                  </span>
                </td>
                <td className="text-center px-3 py-2.5">
                  <Badge
                    variant={statusBadgeVariant(set.status)}
                    className="text-xs"
                  >
                    {set.status}
                  </Badge>
                </td>
                <td className="text-center px-3 py-2.5">
                  <ReviewStatusBadge setId={set.id} reviewStatus={set.review_status ?? "unverified"} onToggled={refetch} />
                </td>
                <td className="text-center px-3 py-2.5">
                  {set.channel ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAssign(set); }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      @{set.channel.username}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAssign(set); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      + Assign
                    </button>
                  )}
                </td>
                <td className="text-center px-3 py-2.5">
                  {set.posted_at ? (
                    <span className="text-xs text-green-600">
                      Posted {formatSchedule(set.posted_at)}
                    </span>
                  ) : set.scheduled_at ? (
                    <span className="text-xs text-primary">
                      {formatSchedule(set.scheduled_at)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="text-right px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">
                    {relativeTime(set.created_at)}
                  </span>
                </td>
                <td className="px-2 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(set.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function GeneratedGrid() {
  const [status, setStatus] = useState("completed");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [assignTarget, setAssignTarget] = useState<GenerationSetWithVideo | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const limit = 20;

  const { sets, total, hasMore, loading, refetch } = useGeneratedSets({
    status,
    reviewStatus,
    sort,
    page,
    limit,
  });

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (sets.every((s) => selected.has(s.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sets.map((s) => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} generation set${selected.size > 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/generation-sets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} set${data.deleted > 1 ? "s" : ""}`);
      setSelected(new Set());
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteAllByStatus = async () => {
    if (!["partial", "failed"].includes(status)) return;
    if (!confirm(`Delete ALL ${status} generation sets? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/generation-sets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Deleted ${data.deleted} ${status} set${data.deleted > 1 ? "s" : ""}`);
      setSelected(new Set());
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  const showDeleteAll = ["partial", "failed"].includes(status) && sets.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Generated Carousels
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} total sets
          </p>
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          <Button
            size="sm"
            variant={viewMode === "table" ? "default" : "ghost"}
            onClick={() => setViewMode("table")}
            className="rounded-none gap-1 text-xs"
          >
            <List className="w-3.5 h-3.5" />
            Table
          </Button>
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "ghost"}
            onClick={() => setViewMode("grid")}
            className="rounded-none gap-1 text-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.value}
                size="sm"
                variant={status === tab.value ? "default" : "ghost"}
                onClick={() => handleStatusChange(tab.value)}
                className="text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-1">
            {REVIEW_TABS.map((tab) => (
              <Button
                key={tab.value}
                size="sm"
                variant={reviewStatus === tab.value ? "secondary" : "ghost"}
                onClick={() => { setReviewStatus(tab.value); setPage(1); }}
                className="text-xs"
              >
                {tab.value === "ready_to_post" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showDeleteAll && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteAllByStatus}
              disabled={bulkDeleting}
              className="text-xs text-destructive hover:text-destructive gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Delete all {status}
            </Button>
          )}
          <div className="w-36">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="text-sm h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="text-xs gap-1 h-7"
          >
            <Trash2 className="w-3 h-3" />
            Delete selected
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </div>
      )}

      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-96 rounded-xl" />
        )
      ) : sets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No generation sets found
            {status !== "all" && ` with status "${status}"`}.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {sets.map((set) => (
                <GeneratedSetCard key={set.id} set={set} />
              ))}
            </div>
          ) : (
            <TableView
              sets={sets}
              selected={selected}
              onToggle={toggleSelect}
              onToggleAll={toggleAll}
              refetch={refetch}
              onAssign={(set) => setAssignTarget(set)}
            />
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}

      <AssignChannelModal
        open={assignTarget !== null}
        set={assignTarget}
        onClose={() => setAssignTarget(null)}
        onSaved={() => refetch()}
      />
    </div>
  );
}
