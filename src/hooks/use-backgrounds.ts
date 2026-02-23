"use client";

import { useState, useEffect, useCallback } from "react";
import type { BackgroundLibraryItem } from "@/types/editor";

export function useBackgrounds() {
  const [backgrounds, setBackgrounds] = useState<BackgroundLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(async (p: number, append: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/backgrounds?page=${p}&limit=18`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBackgrounds((prev) => append ? [...prev, ...data.backgrounds] : data.backgrounds);
      setHasMore(data.hasMore);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchPage(page + 1, true);
    }
  }, [hasMore, loading, page, fetchPage]);

  const mutate = useCallback(() => {
    fetchPage(1);
  }, [fetchPage]);

  return { backgrounds, loading, hasMore, loadMore, mutate };
}
