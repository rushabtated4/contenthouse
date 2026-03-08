import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { trimVideo, extractFirstFrame } from "@/lib/ffmpeg/trim";
import { uploadToStorage } from "@/lib/storage/upload";

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Fetch session
    const { data: session, error: fetchErr } = await supabase
      .from("hook_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { video_url, trim_start, trim_end, video_duration } = session;
    if (!video_url) {
      return NextResponse.json({ error: "No video URL on session" }, { status: 400 });
    }

    const start = trim_start ?? 0;
    const end = trim_end ?? video_duration ?? 10;

    // Download source video
    const videoRes = await fetch(video_url);
    if (!videoRes.ok) {
      return NextResponse.json({ error: "Failed to download source video" }, { status: 500 });
    }
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // Trim video
    const trimmedBuffer = await trimVideo(videoBuffer, start, end);

    // Extract thumbnail
    const thumbnailBuffer = await extractFirstFrame(trimmedBuffer);

    // Upload both
    const [videoUpload, thumbUpload] = await Promise.all([
      uploadToStorage("hook-videos", trimmedBuffer, "mp4", "trimmed"),
      uploadToStorage("hook-images", thumbnailBuffer, "jpg", "thumbnails"),
    ]);

    const trimmedDuration = end - start;

    // Update session
    const { data: updated, error: updateErr } = await supabase
      .from("hook_sessions")
      .update({
        trimmed_video_url: videoUpload.url,
        trimmed_thumbnail_url: thumbUpload.url,
        trimmed_duration: trimmedDuration,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
