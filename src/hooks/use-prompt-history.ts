"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ch:prompt-history";
const MAX_HISTORY = 30;
const MIN_SAVE_LENGTH = 8;

export function usePromptHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const savePrompt = useCallback((prompt: string) => {
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_SAVE_LENGTH) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const deletePrompt = useCallback((prompt: string) => {
    setHistory((prev) => {
      const next = prev.filter((p) => p !== prompt);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { history, savePrompt, deletePrompt };
}
