import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: video, error } = await supabase
      .from("videos")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Fetch all generation sets with their images
    const { data: sets } = await supabase
      .from("generation_sets")
      .select(`
        *,
        generated_images(*)
      `)
      .eq("video_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      ...video,
      generation_sets: sets || [],
      generation_count: sets?.length || 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
