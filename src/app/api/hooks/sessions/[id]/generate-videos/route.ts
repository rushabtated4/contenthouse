import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createKlingPrediction } from "@/lib/replicate/kling";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();
    const {
      characterOrientation = "image",
      prompt = "",
      keepOriginalSound = true,
    } = body;

    // Get session + selected images
    const { data: session, error: sessionError } = await supabase
      .from("hook_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (sessionError) throw sessionError;

    const { data: selectedImages, error: imgError } = await supabase
      .from("hook_generated_images")
      .select("*")
      .eq("session_id", id)
      .eq("selected", true)
      .eq("status", "completed");

    if (imgError) throw imgError;

    if (!selectedImages || selectedImages.length === 0) {
      return NextResponse.json({ error: "No images selected" }, { status: 400 });
    }

    // Update session status
    await supabase
      .from("hook_sessions")
      .update({ status: "generating_videos", updated_at: new Date().toISOString() })
      .eq("id", id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const webhookUrl = appUrl.startsWith("https://") ? `${appUrl}/api/hooks/webhook` : undefined;

    const videoRows = [];
    for (const img of selectedImages) {
      // Create DB row
      const { data: videoRow, error: insertError } = await supabase
        .from("hook_generated_videos")
        .insert({
          session_id: id,
          source_image_id: img.id,
          prompt: prompt || null,
          character_orientation: characterOrientation,
          keep_original_sound: keepOriginalSound,
          status: "generating",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create Kling prediction
      try {
        const { predictionId } = await createKlingPrediction({
          imageUrl: img.image_url!,
          videoUrl: session.video_url,
          prompt,
          characterOrientation,
          keepOriginalSound,
          webhookUrl,
        });

        // Store prediction ID for webhook lookup
        await supabase
          .from("hook_generated_videos")
          .update({ replicate_prediction_id: predictionId })
          .eq("id", videoRow.id);

        videoRows.push({ ...videoRow, replicate_prediction_id: predictionId });
      } catch (predErr) {
        await supabase
          .from("hook_generated_videos")
          .update({
            status: "failed",
            error_message: predErr instanceof Error ? predErr.message : "Failed to create prediction",
          })
          .eq("id", videoRow.id);

        videoRows.push({
          ...videoRow,
          status: "failed",
          error_message: predErr instanceof Error ? predErr.message : "Failed",
        });
      }
    }

    return NextResponse.json({ videos: videoRows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
