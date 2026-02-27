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
      .from("hook_generated_videos")
      .select("video_url")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!video?.video_url) {
      return NextResponse.json({ error: "Video not found or not ready" }, { status: 404 });
    }

    // Fetch the video from storage and stream it
    const videoRes = await fetch(video.video_url);
    if (!videoRes.ok) throw new Error("Failed to fetch video");

    const videoBuffer = await videoRes.arrayBuffer();

    return new NextResponse(new Uint8Array(videoBuffer), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="hook-${id}.mp4"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
