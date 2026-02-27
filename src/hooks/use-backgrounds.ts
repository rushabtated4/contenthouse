"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BackgroundLibraryItem } from "@/types/editor";

// Module-level cache keyed by folderId so data survives dialog unmount/remount
const cache = new Map<string, { backgrounds: BackgroundLibraryItem[]; hasMore: boolean; page: number }>();

function cacheKey(folderId?: string | "unfiled"): string {
  return folderId || "__all__";
}

export function useBackgrounds(folderId?: string | "unfiled") {
  const key = cacheKey(folderId);
  const cached = cache.get(key);

  const [backgrounds, setBackgrounds] = useState<BackgroundLibraryItem[]>(cached?.backgrounds || []);
  const [loading, setLoading] = useState(!cached);
  const [page, setPage] = useState(cached?.page || 1);
  const [hasMore, setHasMore] = useState(cached?.hasMore || false);
  const folderRef = useRef(folderId);

  const fetchPage = useCallback(async (p: number, append: boolean = false, folder?: string | "unfiled") => {
    setLoading(true);
    try {
      let url = `/api/backgrounds?page=${p}&limit=18`;
      const f = folder ?? folderRef.current;
      if (f) url += `&folderId=${f}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBackgrounds((prev) => {
        const updated = append ? [...prev, ...data.backgrounds] : data.backgrounds;
        cache.set(cacheKey(f), { backgrounds: updated, hasMore: data.hasMore, page: p });
        return updated;
      });
      setHasMore(data.hasMore);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    folderRef.current = folderId;
    const k = cacheKey(folderId);
    const c = cache.get(k);
    if (c) {
      // Restore from cache instantly, no loading flash
      setBackgrounds(c.backgrounds);
      setHasMore(c.hasMore);
      setPage(c.page);
      setLoading(false);
    } else {
      setBackgrounds([]);
      setPage(1);
      fetchPage(1, false, folderId);
    }
  }, [folderId, fetchPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchPage(page + 1, true);
    }
  }, [hasMore, loading, page, fetchPage]);

  const mutate = useCallback(() => {
    // Invalidate cache for this folder and refetch
    cache.delete(cacheKey(folderRef.current));
    fetchPage(1, false, folderRef.current);
  }, [fetchPage]);

  return { backgrounds, loading, hasMore, loadMore, mutate };
}
