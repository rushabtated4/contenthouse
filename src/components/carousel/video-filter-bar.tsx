"use client";

import { useEffect, useRef, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/types/database";

interface VideoFilterBarProps {
  search: string;
  onSearchChange: (search: string) => void;
  minViews: string;
  onMinViewsChange: (minViews: string) => void;
  accountId: string;
  onAccountIdChange: (accountId: string) => void;
  dateRange: string;
  onDateRangeChange: (dateRange: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  maxGenCount: string;
  onMaxGenCountChange: (v: string) => void;
  accounts: Account[];
  loaded: number;
  total: number;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

const VIEW_OPTIONS = [
  { label: "Any views", value: "any" },
  { label: "1K+ views", value: "1000" },
  { label: "5K+ views", value: "5000" },
  { label: "10K+ views", value: "10000" },
  { label: "50K+ views", value: "50000" },
  { label: "100K+ views", value: "100000" },
];

const DATE_OPTIONS = [
  { label: "Any date", value: "any" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Most views", value: "most_views" },
];

const GEN_COUNT_OPTIONS = [
  { label: "Any", value: "any" },
  { label: "Has generations", value: "has" },
  { label: "Fresh (0)", value: "1" },
  { label: "< 2 generations", value: "2" },
  { label: "< 5 generations", value: "5" },
];

export function VideoFilterBar({
  search,
  onSearchChange,
  minViews,
  onMinViewsChange,
  accountId,
  onAccountIdChange,
  dateRange,
  onDateRangeChange,
  sort,
  onSortChange,
  maxGenCount,
  onMaxGenCountChange,
  accounts,
  loaded,
  total,
  hasActiveFilters,
  onResetFilters,
}: VideoFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const onSearchChangeRef = useRef(onSearchChange);
  onSearchChangeRef.current = onSearchChange;

  // Debounce search — only re-run when localSearch changes, not callback ref
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChangeRef.current(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Sync external search changes
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search descriptions..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={minViews} onValueChange={onMinViewsChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Views" />
        </SelectTrigger>
        <SelectContent>
          {VIEW_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={accountId} onValueChange={onAccountIdChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              @{acc.username}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Date" />
        </SelectTrigger>
        <SelectContent>
          {DATE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={maxGenCount} onValueChange={onMaxGenCountChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Generations" />
        </SelectTrigger>
        <SelectContent>
          {GEN_COUNT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 ml-auto shrink-0">
        {hasActiveFilters && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {loaded} of {total} videos
        </span>
      </div>
    </div>
  );
}
