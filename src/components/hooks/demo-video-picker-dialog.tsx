"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Video } from "lucide-react";
import type { DemoVideo } from "@/types/hook-editor";

interface DemoVideoPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (demo: DemoVideo) => void;
}

export function DemoVideoPickerDialog({ open, onOpenChange, onSelect }: DemoVideoPickerDialogProps) {
  const [demos, setDemos] = useState<DemoVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    fetch(`/api/demo-videos?${params}`)
      .then((r) => r.json())
      .then((d) => setDemos(d.demos || []))
      .catch(() => setDemos([]))
      .finally(() => setLoading(false));
  }, [open, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Demo Video</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search demos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : demos.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Video className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No demo videos found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 py-2">
              {demos.map((demo) => (
                <div
                  key={demo.id}
                  className="rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => {
                    onSelect(demo);
                    onOpenChange(false);
                  }}
                >
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
                        <Video className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                    {demo.duration != null && (
                      <Badge variant="secondary" className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0">
                        {demo.duration.toFixed(1)}s
                      </Badge>
                    )}
                  </div>
                  <div className="p-1.5">
                    <p className="text-xs truncate">{demo.title || "Untitled"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
