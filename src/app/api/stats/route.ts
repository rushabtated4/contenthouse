import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const [
      totalSetsRes,
      completedSetsRes,
      pendingSetsRes,
      unscheduledSetsRes,
      postedSetsRes,
      allSetsLightRes,
      accountsRes,
    ] = await Promise.all([
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "processing"]),
      // Completed sets with no schedule and not posted
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .is("scheduled_at", null)
        .is("posted_at", null),
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .not("posted_at", "is", null),
      // Lightweight fetch for per-account aggregation
      supabase
        .from("generation_sets")
        .select("channel_id, status, scheduled_at, posted_at")
        .not("channel_id", "is", null),
      supabase
        .from("project_accounts")
        .select("id, username, nickname"),
    ]);

    // Aggregate per-account stats in JS
    type AccountBucket = {
      totalSets: number;
      completedSets: number;
      scheduledSets: number;
      postedSets: number;
    };
    const accountMap = new Map<string, AccountBucket>();
    for (const s of allSetsLightRes.data || []) {
      if (!s.channel_id) continue;
      if (!accountMap.has(s.channel_id)) {
        accountMap.set(s.channel_id, {
          totalSets: 0,
          completedSets: 0,
          scheduledSets: 0,
          postedSets: 0,
        });
      }
      const bucket = accountMap.get(s.channel_id)!;
      bucket.totalSets++;
      if (s.status === "completed") bucket.completedSets++;
      if (s.scheduled_at) bucket.scheduledSets++;
      if (s.posted_at) bucket.postedSets++;
    }

    const accountStats = (accountsRes.data || [])
      .filter((a) => accountMap.has(a.id))
      .map((a) => ({
        id: a.id,
        username: a.username,
        nickname: a.nickname,
        ...accountMap.get(a.id)!,
      }));

    return NextResponse.json({
      totalSets: totalSetsRes.count || 0,
      completedSets: completedSetsRes.count || 0,
      pendingSets: pendingSetsRes.count || 0,
      unscheduledSets: unscheduledSetsRes.count || 0,
      postedSets: postedSetsRes.count || 0,
      accountStats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
