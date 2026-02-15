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
    const video = s.videos as Record<string, unknown> | null;
    const account = s.project_accounts as Record<string, unknown> | null;
    const images =
      (s.generated_images as Array<Record<string, unknown>>) || [];
    const firstCompleted = images.find(
      (i) => i.status === "completed" && i.image_url
    );
    const isPosted = !!s.posted_at;
    const project = (account as Record<string, unknown>)?.projects as Record<string, unknown> | null;
    const projectColor = (project?.color as string) || undefined;

    return {
      id: s.id as string,
      title: (s.title as string) || (video?.description as string)?.slice(0, 50) || "Carousel",
      start: s.scheduled_at as string,
      backgroundColor: isPosted ? "#16a34a" : projectColor,
      borderColor: isPosted ? "#16a34a" : projectColor,
      extendedProps: {
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
