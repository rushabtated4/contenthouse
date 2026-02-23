"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VideoCard } from "./video-card";
import { AppTabs } from "./app-tabs";
import { VideoFilterBar } from "./video-filter-bar";
import { VideoGridSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UrlInput } from "@/components/generate/url-input";
import { Loader2, Wand2 } from "lucide-react";
import { useVideos, type VideoFilters } from "@/hooks/use-videos";
import { useApps } from "@/hooks/use-apps";
import type { Account } from "@/types/database";

const DEFAULT_FILTERS = {
  search: "",
  minViews: "5000",
  accountId: "all",
  dateRange: "any",
  sort: "newest",
  maxGenCount: "any",
  appId: null as string | null,
};

export function VideoGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter state — initialize from URL search params
  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    searchParams.get("appId") ?? DEFAULT_FILTERS.appId
  );
  const [search, setSearch] = useState(
    searchParams.get("search") ?? DEFAULT_FILTERS.search
  );
  const [minViews, setMinViews] = useState(
    searchParams.get("minViews") ?? DEFAULT_FILTERS.minViews
  );
  const [accountId, setAccountId] = useState(
    searchParams.get("accountId") ?? DEFAULT_FILTERS.accountId
  );
  const [dateRange, setDateRange] = useState(
    searchParams.get("dateRange") ?? DEFAULT_FILTERS.dateRange
  );
  const [sort, setSort] = useState(
    searchParams.get("sort") ?? DEFAULT_FILTERS.sort
  );
  const [maxGenCount, setMaxGenCount] = useState(
    searchParams.get("maxGenCount") ?? DEFAULT_FILTERS.maxGenCount
  );

  const { apps, loading: appsLoading } = useApps();

  // Sync filter state to URL search params
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (minViews !== DEFAULT_FILTERS.minViews) params.set("minViews", minViews);
    if (accountId !== DEFAULT_FILTERS.accountId) params.set("accountId", accountId);
    if (dateRange !== DEFAULT_FILTERS.dateRange) params.set("dateRange", dateRange);
    if (sort !== DEFAULT_FILTERS.sort) params.set("sort", sort);
    if (maxGenCount !== DEFAULT_FILTERS.maxGenCount) params.set("maxGenCount", maxGenCount);
    if (selectedAppId) params.set("appId", selectedAppId);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/videos", { scroll: false });
  }, [search, minViews, accountId, dateRange, sort, maxGenCount, selectedAppId, router]);

  const hasActiveFilters = useMemo(
    () =>
      search !== DEFAULT_FILTERS.search ||
      minViews !== DEFAULT_FILTERS.minViews ||
      accountId !== DEFAULT_FILTERS.accountId ||
      dateRange !== DEFAULT_FILTERS.dateRange ||
      sort !== DEFAULT_FILTERS.sort ||
      maxGenCount !== DEFAULT_FILTERS.maxGenCount ||
      selectedAppId !== DEFAULT_FILTERS.appId,
    [search, minViews, accountId, dateRange, sort, maxGenCount, selectedAppId]
  );

  // Compute date filters
  const dateFilters = useMemo(() => {
    if (dateRange === "any") return { dateFrom: null, dateTo: null };
    const days = parseInt(dateRange, 10);
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { dateFrom: from.toISOString(), dateTo: null };
  }, [dateRange]);

  const filters: VideoFilters = useMemo(
    () => ({
      appId: selectedAppId,
      accountId: accountId !== "all" ? accountId : null,
      search: search || undefined,
      minViews: minViews !== "any" ? parseInt(minViews, 10) : null,
      dateFrom: dateFilters.dateFrom,
      dateTo: dateFilters.dateTo,
      sort,
      maxGenCount: maxGenCount !== "any" && maxGenCount !== "has" ? parseInt(maxGenCount, 10) : null,
      minGenCount: maxGenCount === "has" ? 1 : null,
    }),
    [selectedAppId, accountId, search, minViews, dateFilters, sort, maxGenCount]
  );

  const {
    videos,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    refetch,
    resetPages,
  } = useVideos({ limit: 24, filters });

  const handleResetFilters = useCallback(() => {
    setSearch(DEFAULT_FILTERS.search);
    setMinViews(DEFAULT_FILTERS.minViews);
    setAccountId(DEFAULT_FILTERS.accountId);
    setDateRange(DEFAULT_FILTERS.dateRange);
    setSort(DEFAULT_FILTERS.sort);
    setMaxGenCount(DEFAULT_FILTERS.maxGenCount);
    setSelectedAppId(DEFAULT_FILTERS.appId);
    resetPages();
  }, [resetPages]);

  // Available accounts based on selected app
  const availableAccounts: Account[] = useMemo(() => {
    if (!selectedAppId) {
      return apps.flatMap((app) => app.accounts || []);
    }
    const selectedApp = apps.find((a) => a.id === selectedAppId);
    return selectedApp?.accounts || [];
  }, [apps, selectedAppId]);

  // Handle app tab change
  const handleAppSelect = useCallback(
    (appId: string | null) => {
      setSelectedAppId(appId);
      // Reset account filter if current account doesn't belong to new app
      if (appId && accountId !== "all") {
        const app = apps.find((a) => a.id === appId);
        const accountBelongs = app?.accounts?.some((a) => a.id === accountId);
        if (!accountBelongs) setAccountId("all");
      }
      resetPages();
    },
    [accountId, apps, resetPages]
  );

  const handleSearchChange = useCallback(
    (val: string) => {
      setSearch(val);
      resetPages();
    },
    [resetPages]
  );

  const handleMinViewsChange = useCallback(
    (val: string) => {
      setMinViews(val);
      resetPages();
    },
    [resetPages]
  );

  const handleAccountIdChange = useCallback(
    (val: string) => {
      setAccountId(val);
      resetPages();
    },
    [resetPages]
  );

  const handleDateRangeChange = useCallback(
    (val: string) => {
      setDateRange(val);
      resetPages();
    },
    [resetPages]
  );

  const handleSortChange = useCallback(
    (val: string) => {
      setSort(val);
      resetPages();
    },
    [resetPages]
  );

  const handleMaxGenCountChange = useCallback(
    (val: string) => {
      setMaxGenCount(val);
      resetPages();
    },
    [resetPages]
  );

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viral Carousels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse and replicate viral TikTok carousels
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setFetchError(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Wand2 className="w-4 h-4" />
              Generate with TikTok URL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Fetch TikTok Carousel</DialogTitle>
            </DialogHeader>
            <UrlInput
              onFetch={({ video }) => {
                setDialogOpen(false);
                router.push(`/generate/${(video as { id: string }).id}`);
              }}
              onError={(err) => setFetchError(err)}
            />
            {fetchError && (
              <p className="text-xs text-destructive mt-2">{fetchError}</p>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* App tabs */}
      <AppTabs
        apps={apps}
        selectedAppId={selectedAppId}
        onSelect={handleAppSelect}
        loading={appsLoading}
      />

      {/* Filter bar */}
      <VideoFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        minViews={minViews}
        onMinViewsChange={handleMinViewsChange}
        accountId={accountId}
        onAccountIdChange={handleAccountIdChange}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        sort={sort}
        onSortChange={handleSortChange}
        maxGenCount={maxGenCount}
        onMaxGenCountChange={handleMaxGenCountChange}
        accounts={availableAccounts}
        loaded={videos.length}
        total={total}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
      />

      {/* Grid */}
      {loading ? (
        <VideoGridSkeleton />
      ) : videos.length === 0 ? (
        <EmptyState
          title="No carousels found"
          description="Try adjusting your filters or use the Generate button above to fetch a TikTok carousel."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => loadMore()}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load more (${videos.length} of ${total})`
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
