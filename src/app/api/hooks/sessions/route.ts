import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    const withUsageCount = searchParams.get("withUsageCount") === "true";

    let query = supabase
      .from("hook_sessions")
      .select("*, hook_generated_images(count), hook_generated_videos(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const hasTrimmedClip = searchParams.get("hasTrimmedClip");
    if (hasTrimmedClip === "true") {
      query = query.not("trimmed_video_url", "is", null);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    let sessions = data || [];

    // Compute usage counts if requested
    if (withUsageCount && sessions.length > 0) {
      // For tiktok-sourced sessions: count other sessions sharing same tiktok_video_id
      const tiktokVideoIds = sessions
        .filter((s) => s.tiktok_video_id)
        .map((s) => s.tiktok_video_id as string);

      const uniqueIds = [...new Set(tiktokVideoIds)];
      const usageCounts: Record<string, number> = {};

      if (uniqueIds.length > 0) {
        const { data: countData } = await supabase
          .from("hook_sessions")
          .select("tiktok_video_id", { count: "exact", head: false })
          .in("tiktok_video_id", uniqueIds);

        if (countData) {
          for (const row of countData) {
            const vid = row.tiktok_video_id as string;
            usageCounts[vid] = (usageCounts[vid] || 0) + 1;
          }
        }
      }

      // For clip-sourced: count sessions with source_session_id pointing to this session
      const sessionIds = sessions.map((s) => s.id);
      const { data: clipCountData } = await supabase
        .from("hook_sessions")
        .select("source_session_id")
        .in("source_session_id", sessionIds);

      const clipCounts: Record<string, number> = {};
      if (clipCountData) {
        for (const row of clipCountData) {
          const sid = row.source_session_id as string;
          clipCounts[sid] = (clipCounts[sid] || 0) + 1;
        }
      }

      sessions = sessions.map((s) => ({
        ...s,
        usage_count: s.tiktok_video_id
          ? (usageCounts[s.tiktok_video_id] || 1) - 1 // subtract self
          : 0,
        clip_usage_count: clipCounts[s.id] || 0,
      }));
    }

    return NextResponse.json({
      sessions,
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { sourceType, videoUrl, tiktokUrl, tiktokVideoId, videoDuration, sourceSessionId, trimStart, trimEnd, stats } = body;

    if (!sourceType || !videoUrl) {
      return NextResponse.json({ error: "sourceType and videoUrl are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hook_sessions")
      .insert({
        source_type: sourceType,
        video_url: videoUrl,
        tiktok_url: tiktokUrl || null,
        tiktok_video_id: tiktokVideoId || null,
        video_duration: videoDuration || null,
        source_session_id: sourceSessionId || null,
        trim_start: trimStart ?? 0,
        trim_end: trimEnd ?? null,
        tiktok_play_count: stats?.playCount ?? null,
        tiktok_digg_count: stats?.diggCount ?? null,
        tiktok_comment_count: stats?.commentCount ?? null,
        tiktok_share_count: stats?.shareCount ?? null,
        tiktok_collect_count: stats?.collectCount ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
