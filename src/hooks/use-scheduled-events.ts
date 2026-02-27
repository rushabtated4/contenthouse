"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/swr/fetcher";

export interface ScheduledEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    type: "carousel" | "hook";
    setId: string;
    videoId: string | null;
    channelId: string | null;
    thumbnail: string | null;
    channelLabel: string | null;
    postedAt: string | null;
  };
}

function mapEvents(data: unknown): ScheduledEvent[] {
  if (!Array.isArray(data)) return [];
  return data.map((s: Record<string, unknown>) => {
    const itemType = (s._type as string) || "carousel";
    const account = s.project_accounts as Record<string, unknown> | null;
    const isPosted = !!s.posted_at;
    const project = (account as Record<string, unknown>)?.projects as Record<string, unknown> | null;
    const projectColor = (project?.color as string) || undefined;

    if (itemType === "hook") {
      // Hook video event
      const hookImage = s.hook_generated_images as Record<string, unknown> | null;
      return {
        id: s.id as string,
        title: (s.notes as string)?.slice(0, 50) || "Hook Video",
        start: s.scheduled_at as string,
        backgroundColor: isPosted ? "#16a34a" : projectColor || "#8b5cf6",
        borderColor: isPosted ? "#16a34a" : projectColor || "#8b5cf6",
        extendedProps: {
          type: "hook" as const,
          setId: s.id as string,
          videoId: null,
          channelId: s.channel_id as string | null,
          thumbnail: (hookImage?.image_url as string) || null,
          channelLabel: (account?.username as string) || null,
          postedAt: (s.posted_at as string) || null,
        },
      };
    }

    // Carousel event (existing logic)
    const video = s.videos as Record<string, unknown> | null;
    const images =
      (s.generated_images as Array<Record<string, unknown>>) || [];
    const firstCompleted = images.find(
      (i) => i.status === "completed" && i.image_url
    );

    return {
      id: s.id as string,
      title: (s.title as string) || (video?.description as string)?.slice(0, 50) || "Carousel",
      start: s.scheduled_at as string,
      backgroundColor: isPosted ? "#16a34a" : projectColor,
      borderColor: isPosted ? "#16a34a" : projectColor,
      extendedProps: {
        type: "carousel" as const,
        setId: s.id as string,
        videoId: (s.video_id as string) || null,
        channelId: s.channel_id as string | null,
        thumbnail: (firstCompleted?.image_url as string) || null,
        channelLabel: (account?.username as string) || null,
        postedAt: (s.posted_at as string) || null,
      },
    };
  });
}

export function useScheduledEvents(
  channelFilter?: string | null,
  statusFilter?: string | null
) {
  const params = new URLSearchParams();
  if (channelFilter) params.set("channelId", channelFilter);
  if (statusFilter && statusFilter !== "all") params.set("filter", statusFilter);
  const qs = params.toString();
  const key = qs ? `/api/schedule?${qs}` : "/api/schedule";

  const { data, isLoading, mutate } = useSWR(key, fetcher);

  return {
    events: mapEvents(data),
    loading: isLoading,
    refetch: mutate,
  };
}
