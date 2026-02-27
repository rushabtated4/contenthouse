import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getPredictionStatus } from "@/lib/replicate/kling";
import { uploadToStorage } from "@/lib/storage/upload";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("hook_sessions")
      .select(`
        *,
        hook_generated_images(*),
        hook_generated_videos(*, hook_generated_images(*))
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Poll Replicate for any "generating" videos (fallback when no webhook)
    const generatingVideos = (data.hook_generated_videos || []).filter(
      (v: { status: string; replicate_prediction_id: string | null }) =>
        v.status === "generating" && v.replicate_prediction_id
    );

    for (const video of generatingVideos) {
      try {
        const pred = await getPredictionStatus(video.replicate_prediction_id!);

        if (pred.status === "succeeded" && pred.output) {
          const outputUrl = typeof pred.output === "string" ? pred.output : pred.output[0];
          const videoRes = await fetch(outputUrl);
          const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
          const { url: storedUrl } = await uploadToStorage("hook-videos", videoBuffer, "mp4", "generated");

          await supabase
            .from("hook_generated_videos")
            .update({ video_url: storedUrl, status: "completed", updated_at: new Date().toISOString() })
            .eq("id", video.id);

          video.video_url = storedUrl;
          video.status = "completed";
        } else if (pred.status === "failed" || pred.status === "canceled") {
          const errMsg = typeof pred.error === "string" ? pred.error : "Prediction failed";
          await supabase
            .from("hook_generated_videos")
            .update({ status: "failed", error_message: errMsg, updated_at: new Date().toISOString() })
            .eq("id", video.id);

          video.status = "failed";
          video.error_message = errMsg;
        }
        // "starting" or "processing" → still generating, no update needed
      } catch {
        // Replicate poll failed silently, will retry on next client poll
      }
    }

    // If all videos are done, update session status
    const allVideos = data.hook_generated_videos || [];
    if (allVideos.length > 0 && allVideos.every((v: { status: string }) => v.status === "completed" || v.status === "failed")) {
      if (data.status === "generating_videos") {
        await supabase
          .from("hook_sessions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("id", id);
        data.status = "completed";
      }
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("trimStart" in body) updateData.trim_start = body.trimStart;
    if ("trimEnd" in body) updateData.trim_end = body.trimEnd;
    if ("videoDuration" in body) updateData.video_duration = body.videoDuration;
    if ("status" in body) updateData.status = body.status;

    const { data, error } = await supabase
      .from("hook_sessions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from("hook_sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
