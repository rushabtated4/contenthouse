"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectWithAccounts, ProjectAccount } from "@/types/database";

export interface ScheduledSetSummary {
  id: string;
  channel_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  title: string | null;
  video_id: string | null;
  thumbnail_url: string | null;
}

export interface PostingSlot {
  date: Date;
  slotIndex: number;
  set: ScheduledSetSummary | null;
  status: "posted" | "scheduled" | "empty";
}

export interface DayCell {
  date: Date;
  dayOfWeek: number;
  active: boolean;
  slots: PostingSlot[];
}

export interface WeekRow {
  weekLabel: string;
  days: DayCell[];
}

export function computeWeekGrid(
  account: ProjectAccount,
  scheduledSets: ScheduledSetSummary[],
  weeks = 2
): WeekRow[] {
  const daysOfWeek = account.days_of_week ?? [1, 2, 3, 4, 5];
  const postsPerDay = account.posts_per_day ?? 1;

  const accountSets = scheduledSets.filter(
    (s) => s.channel_id === account.id && s.scheduled_at !== null
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the most recent Sunday
  const startOfWeek = new Date(today);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const rows: WeekRow[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(startOfWeek);
    weekStart.setDate(weekStart.getDate() + w * 7);

    const weekLabel = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const days: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      const dow = date.getDay();
      const active = daysOfWeek.includes(dow);
      const dayStr = date.toDateString();

      const cellSlots: PostingSlot[] = [];
      if (active) {
        const daySets = accountSets.filter(
          (s) => s.scheduled_at && new Date(s.scheduled_at).toDateString() === dayStr
        );
        for (let i = 0; i < postsPerDay; i++) {
          const matchedSet = daySets[i] ?? null;
          let status: PostingSlot["status"] = "empty";
          if (matchedSet) {
            status = matchedSet.posted_at ? "posted" : "scheduled";
          }
          cellSlots.push({ date, slotIndex: i, set: matchedSet, status });
        }
      }

      days.push({ date, dayOfWeek: dow, active, slots: cellSlots });
    }

    rows.push({ weekLabel, days });
  }

  return rows;
}

export function computeSlots(
  account: ProjectAccount,
  scheduledSets: ScheduledSetSummary[],
  weeks = 2
): PostingSlot[] {
  const slots: PostingSlot[] = [];
  const daysOfWeek = account.days_of_week ?? [1, 2, 3, 4, 5];
  const postsPerDay = account.posts_per_day ?? 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + weeks * 7);

  const accountSets = scheduledSets.filter(
    (s) => s.channel_id === account.id && s.scheduled_at !== null
  );

  const current = new Date(today);
  while (current < end) {
    if (daysOfWeek.includes(current.getDay())) {
      const dayStr = current.toDateString();

      const daySets = accountSets.filter(
        (s) => s.scheduled_at && new Date(s.scheduled_at).toDateString() === dayStr
      );

      for (let i = 0; i < postsPerDay; i++) {
        const matchedSet = daySets[i] ?? null;
        let status: PostingSlot["status"] = "empty";
        if (matchedSet) {
          status = matchedSet.posted_at ? "posted" : "scheduled";
        }
        slots.push({
          date: new Date(current),
          slotIndex: i,
          set: matchedSet,
          status,
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return slots;
}

export function useAccountOverview() {
  const [projects, setProjects] = useState<ProjectWithAccounts[]>([]);
  const [scheduledSets, setScheduledSets] = useState<ScheduledSetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapSchedule = (data: any[]) =>
    data.map((s) => {
      // Extract thumbnail from the first completed generated image
      const images = Array.isArray(s.generated_images) ? s.generated_images : [];
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
      const [projectsRes, scheduleRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/schedule?filter=all"),
      ]);

      const projectsData = await projectsRes.json();
      const scheduleData = await scheduleRes.json();

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setScheduledSets(mapSchedule(Array.isArray(scheduleData) ? scheduleData : []));
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
      setScheduledSets(mapSchedule(Array.isArray(data) ? data : []));
    } catch {
      // leave state as-is
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { projects, scheduledSets, loading, mutate: refreshSchedule };
}
