import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "24", 10), 50);
    const offset = (page - 1) * limit;

    const { data: videos, error, count } = await supabase
      .from("videos")
      .select(`
        *,
        generation_sets(id)
      `, { count: "exact" })
      .not('original_images', 'is', null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const total = count || 0;

    // Add generation count to each video
    const videosWithCount = (videos || []).map((v) => ({
      ...v,
      generation_count: v.generation_sets?.length || 0,
      generation_sets: undefined,
    }));

    return NextResponse.json({
      videos: videosWithCount,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
