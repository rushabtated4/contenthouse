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

    let query = supabase
      .from("hook_sessions")
      .select("*, hook_generated_images(count), hook_generated_videos(count)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      sessions: data || [],
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
    const { sourceType, videoUrl, tiktokUrl, tiktokVideoId, videoDuration } = body;

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
