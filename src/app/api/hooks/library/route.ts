import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const channelId = searchParams.get("channelId");
    const isUsed = searchParams.get("isUsed");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("hook_generated_videos")
      .select(`
        *,
        hook_generated_images(*),
        hook_sessions(id, source_type, video_url, snapshot_url, created_at),
        project_accounts:channel_id(id, username, nickname, project_id, projects(id, name, color))
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    } else {
      // Default: only show completed
      query = query.eq("status", "completed");
    }

    if (channelId) {
      query = query.eq("channel_id", channelId);
    }

    if (isUsed === "true") {
      query = query.eq("is_used", true);
    } else if (isUsed === "false") {
      query = query.eq("is_used", false);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      videos: data || [],
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
