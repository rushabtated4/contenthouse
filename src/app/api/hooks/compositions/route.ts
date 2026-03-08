import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const reviewStatus = searchParams.get("reviewStatus");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("hook_compositions")
      .select(`
        *,
        hook_generated_videos(id, video_url, session_id),
        demo_videos(*),
        project_accounts:channel_id(id, username, nickname, project_id, projects(id, name, color))
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (reviewStatus) {
      query = query.eq("review_status", reviewStatus);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      compositions: data || [],
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
    const { sourceVideoId, textOverlays, demoVideoId } = await request.json();

    if (!sourceVideoId) {
      return NextResponse.json({ error: "sourceVideoId is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hook_compositions")
      .insert({
        source_video_id: sourceVideoId,
        text_overlays: textOverlays || [],
        demo_video_id: demoVideoId || null,
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
