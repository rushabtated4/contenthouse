import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateWebhookSignature } from "@/lib/replicate/webhook";
import { uploadToStorage } from "@/lib/storage/upload";

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get("webhook-signature");
    const secret = process.env.REPLICATE_WEBHOOK_SECRET || "";

    // Validate signature if secret is configured
    if (secret && !validateWebhookSignature(bodyText, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    const predictionId = payload.id;
    const status = payload.status; // "succeeded" | "failed" | "canceled"

    const supabase = createServerClient();

    // Find the video row by prediction ID
    const { data: videoRow, error: findError } = await supabase
      .from("hook_generated_videos")
      .select("*, hook_sessions(id)")
      .eq("replicate_prediction_id", predictionId)
      .single();

    if (findError || !videoRow) {
      console.error("Webhook: video row not found for prediction", predictionId);
      return NextResponse.json({ ok: true });
    }

    if (status === "succeeded" && payload.output) {
      // Download and store the output video
      const outputUrl = typeof payload.output === "string" ? payload.output : payload.output[0];

      try {
        const videoRes = await fetch(outputUrl);
        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
        const { url: storedUrl } = await uploadToStorage("hook-videos", videoBuffer, "mp4", "generated");

        await supabase
          .from("hook_generated_videos")
          .update({
            video_url: storedUrl,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", videoRow.id);
      } catch {
        await supabase
          .from("hook_generated_videos")
          .update({
            status: "failed",
            error_message: "Failed to store output video",
            updated_at: new Date().toISOString(),
          })
          .eq("id", videoRow.id);
      }
    } else {
      await supabase
        .from("hook_generated_videos")
        .update({
          status: "failed",
          error_message: payload.error || `Prediction ${status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", videoRow.id);
    }

    // Check if all videos for session are done, update session status
    const sessionId = videoRow.session_id;
    const { data: allVideos } = await supabase
      .from("hook_generated_videos")
      .select("status")
      .eq("session_id", sessionId);

    const allDone = allVideos?.every(
      (v) => v.status === "completed" || v.status === "failed"
    );

    if (allDone) {
      await supabase
        .from("hook_sessions")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true }); // Always 200 for webhooks
  }
}
