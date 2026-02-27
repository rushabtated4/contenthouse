"use client";

import { useState, useEffect, useCallback } from "react";
import type { BackgroundFolder } from "@/types/editor";

// Module-level cache so data survives dialog unmount/remount
let cachedFolders: BackgroundFolder[] | null = null;

export function useBackgroundFolders() {
  const [folders, setFolders] = useState<BackgroundFolder[]>(cachedFolders || []);
  const [loading, setLoading] = useState(cachedFolders === null);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backgrounds/folders");
      if (!res.ok) throw new Error("Failed to fetch folders");
      const data = await res.json();
      const result = data.folders || [];
      cachedFolders = result;
      setFolders(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if no cache; otherwise show cached data instantly
    if (cachedFolders === null) {
      fetchFolders();
    }
  }, [fetchFolders]);

  const createFolder = useCallback(async (name: string) => {
    const res = await fetch("/api/backgrounds/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to create folder");
    const folder = await res.json();
    const updated = [folder, ...folders];
    cachedFolders = updated;
    setFolders(updated);
    return folder as BackgroundFolder;
  }, [folders]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/backgrounds/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to rename folder");
    setFolders((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, name } : f));
      cachedFolders = updated;
      return updated;
    });
  }, []);

  const deleteFolder = useCallback(async (id: string, deleteImages: boolean) => {
    const res = await fetch(
      `/api/backgrounds/folders/${id}?deleteImages=${deleteImages}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete folder");
    setFolders((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      cachedFolders = updated;
      return updated;
    });
  }, []);

  const mutate = useCallback(() => {
    fetchFolders();
  }, [fetchFolders]);

  return { folders, loading, createFolder, renameFolder, deleteFolder, mutate };
}
