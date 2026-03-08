"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectWithAccounts } from "@/types/database";
import type { ScheduledSetSummary } from "@/hooks/use-account-overview";

export function usePosterOverview() {
  const [projects, setProjects] = useState<ProjectWithAccounts[]>([]);
  const [scheduledSets, setScheduledSets] = useState<ScheduledSetSummary[]>([]);
  const [posterName, setPosterName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapSchedule = (data: any[]) =>
    data.map((s) => {
      const images = Array.isArray(s.generated_images) ? s.generated_images : [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completed = images.find((img: any) => img.status === "completed" && img.image_url);
      return {
        id: s.id,
        channel_id: s.channel_id,
        scheduled_at: s.scheduled_at,
        posted_at: s.posted_at,
        title: s.title,
        video_id: s.video_id,
        thumbnail_url: completed?.image_url ?? null,
      };
    });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Read poster info from cookie (client-side readable name from login response)
      // We get poster's channels from the API which already filters by poster_id
      const [channelsRes, scheduleRes] = await Promise.all([
        fetch("/api/poster/channels"),
        fetch("/api/schedule?filter=all"),
      ]);

      const channelsData = await channelsRes.json();
      const scheduleData = await scheduleRes.json();

      const projectsArr: ProjectWithAccounts[] = Array.isArray(channelsData) ? channelsData : [];
      setProjects(projectsArr);

      // Get poster's channel IDs to filter schedule data
      const channelIds = new Set(
        projectsArr.flatMap((p) => p.project_accounts.map((a) => a.id))
      );

      const allSets = mapSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      // Filter schedule to only poster's channels
      setScheduledSets(allSets.filter((s) => s.channel_id && channelIds.has(s.channel_id)));

      // Read poster display name from cookie
      try {
        const cookie = document.cookie
          .split("; ")
          .find((c) => c.startsWith("ch_poster="));
        if (cookie) {
          // Cookie is httpOnly, so we can't read it. We'll get the name from the API instead.
        }
      } catch {
        // ignore
      }
    } catch {
      // leave state as-is
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule?filter=all");
      const data = await res.json();
      const allSets = mapSchedule(Array.isArray(data) ? data : []);

      const channelIds = new Set(
        projects.flatMap((p) => p.project_accounts.map((a) => a.id))
      );
      setScheduledSets(allSets.filter((s) => s.channel_id && channelIds.has(s.channel_id)));
    } catch {
      // leave state as-is
    }
  }, [projects]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projects, scheduledSets, posterName, loading, mutate: refreshSchedule };
}
