"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Video, Search, Pencil, Check, X } from "lucide-react";
import { DemoVideoUploadZone } from "./demo-video-upload-zone";
import type { DemoVideo } from "@/types/hook-editor";
import { toast } from "sonner";

export function DemoVideoLibrary() {
  const [demos, setDemos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadDemos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/demo-videos?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDemos(data.demos || []);
    } catch {
      setDemos([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadDemos(); }, [loadDemos]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this demo video?")) return;
    try {
      const res = await fetch(`/api/demo-videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Demo deleted");
      loadDemos();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleRename = async (id: string) => {
    try {
      const res = await fetch(`/api/demo-videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      loadDemos();
    } catch {
      toast.error("Failed to rename");
    }
  };

  function formatSize(bytes: number | null): string {
    if (!bytes) return "";
    if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + " MB";
    return (bytes / 1_000).toFixed(0) + " KB";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo Video Library</h1>
        <p className="text-sm text-muted-foreground">
          Upload product demo clips to attach after hook videos.
        </p>
      </div>

      <DemoVideoUploadZone onUploaded={loadDemos} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search demos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      ) : demos.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Video className="w-10 h-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No demo videos yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {demos.map((demo) => (
            <Card key={demo.id} className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                {demo.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={demo.thumbnail_url}
                    alt={demo.title || "Demo"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                {demo.duration != null && (
                  <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0">
                    {demo.duration.toFixed(1)}s
                  </Badge>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                {editingId === demo.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-6 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(demo.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleRename(demo.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs font-medium truncate">{demo.title || "Untitled"}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {formatSize(demo.file_size)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => { setEditingId(demo.id); setEditTitle(demo.title || ""); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => handleDelete(demo.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
