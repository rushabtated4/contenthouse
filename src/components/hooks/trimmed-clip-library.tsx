"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Upload, Video, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import type { HookSession } from "@/types/hooks";

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

interface TrimmedClipLibraryProps {
  onSelectClip: (session: HookSession) => void;
}

export function TrimmedClipLibrary({ onSelectClip }: TrimmedClipLibraryProps) {
  const [clips, setClips] = useState<HookSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/hooks/sessions?hasTrimmedClip=true&limit=50&withUsageCount=true");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setClips(data.sessions || []);
      } catch {
        setClips([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading clips...
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Video className="w-10 h-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No trimmed clips yet.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Clips are auto-saved when you confirm a trim in Step 2.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
      {clips.map((clip) => (
        <Card
          key={clip.id}
          className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onSelectClip(clip)}
        >
          <div className="relative aspect-video bg-muted">
            {clip.trimmed_thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clip.trimmed_thumbnail_url}
                alt="Clip thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
            {clip.trimmed_duration != null && (
              <Badge
                variant="secondary"
                className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0"
              >
                {clip.trimmed_duration.toFixed(1)}s
              </Badge>
            )}
            {(clip as HookSession & { clip_usage_count?: number }).clip_usage_count != null &&
              (clip as HookSession & { clip_usage_count?: number }).clip_usage_count! > 0 && (
              <Badge
                className="absolute top-1 right-1 text-[10px] px-1.5 py-0 bg-primary"
              >
                {(clip as HookSession & { clip_usage_count?: number }).clip_usage_count}x used
              </Badge>
            )}
          </div>
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {clip.source_type === "tiktok" ? (
                  <Video className="w-3 h-3" />
                ) : (
                  <Upload className="w-3 h-3" />
                )}
                <span className="capitalize">{clip.source_type}</span>
              </div>
              <div className="flex items-center gap-1">
                {clip.trimmed_video_url && (
                  <a
                    href={clip.trimmed_video_url}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-primary"
                    title="Download clip"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                )}
                {clip.tiktok_url && (
                  <a
                    href={clip.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-primary"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            {clip.tiktok_play_count != null && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{formatCompact(clip.tiktok_play_count)}</span>
                {clip.tiktok_digg_count != null && <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{formatCompact(clip.tiktok_digg_count)}</span>}
                {clip.tiktok_comment_count != null && <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{formatCompact(clip.tiktok_comment_count)}</span>}
                {clip.tiktok_share_count != null && <span className="flex items-center gap-0.5"><Share2 className="w-2.5 h-2.5" />{formatCompact(clip.tiktok_share_count)}</span>}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              {new Date(clip.created_at).toLocaleDateString()}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
