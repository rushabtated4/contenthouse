"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon } from "lucide-react";

interface UrlInputProps {
  onFetch: (videoData: { video: Record<string, unknown>; isExisting: boolean }) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export function UrlInput({ onFetch, onError, disabled }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        onError(data.error || "Failed to fetch TikTok post");
        return;
      }

      onFetch(data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="url"
          placeholder="Paste TikTok carousel URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="pl-10 h-12 text-base rounded-xl"
          disabled={disabled || loading}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-12 px-6 rounded-xl"
        disabled={disabled || loading || !url.trim()}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Fetching...
          </>
        ) : (
          "Fetch"
        )}
      </Button>
    </form>
  );
}
