import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateWithNanoBanana } from "@/lib/replicate/nano-banana";
import { uploadToStorage } from "@/lib/storage/upload";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { prompt, numImages = 1, aspectRatio = "2:3" } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    // Get session with snapshot
    const { data: session, error: sessionError } = await supabase
      .from("hook_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (sessionError) throw sessionError;
    if (!session?.snapshot_url) {
      return NextResponse.json({ error: "No snapshot captured yet" }, { status: 400 });
    }

    // Update status
    await supabase
      .from("hook_sessions")
      .update({ status: "generating_images", updated_at: new Date().toISOString() })
      .eq("id", id);

    // Create placeholder rows
    const placeholders = Array.from({ length: numImages }, () => ({
      session_id: id,
      prompt,
      status: "generating" as const,
    }));

    const { data: imageRows, error: insertError } = await supabase
      .from("hook_generated_images")
      .insert(placeholders)
      .select();

    if (insertError) throw insertError;

    // Call Nano Banana Pro (synchronous ~10s)
    try {
      const result = await generateWithNanoBanana({
        prompt,
        imageUrl: session.snapshot_url,
        numImages,
        aspectRatio,
      });

      // Download and store each generated image
      const updatedImages = [];
      for (let i = 0; i < imageRows!.length; i++) {
        const row = imageRows![i];
        const outputUrl = result.imageUrls[i];

        if (outputUrl) {
          try {
            const imgRes = await fetch(outputUrl);
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const { url: storedUrl } = await uploadToStorage("hook-images", imgBuffer, "png", "generated");

            const { data: updated } = await supabase
              .from("hook_generated_images")
              .update({ image_url: storedUrl, status: "completed" })
              .eq("id", row.id)
              .select()
              .single();

            updatedImages.push(updated);
          } catch {
            await supabase
              .from("hook_generated_images")
              .update({ status: "failed", error_message: "Failed to store image" })
              .eq("id", row.id);
            updatedImages.push({ ...row, status: "failed" });
          }
        } else {
          await supabase
            .from("hook_generated_images")
            .update({ status: "failed", error_message: "No output from model" })
            .eq("id", row.id);
          updatedImages.push({ ...row, status: "failed" });
        }
      }

      // Update session status
      await supabase
        .from("hook_sessions")
        .update({ status: "images_ready", updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({ images: updatedImages });
    } catch (genErr) {
      // Mark all as failed
      for (const row of imageRows!) {
        await supabase
          .from("hook_generated_images")
          .update({
            status: "failed",
            error_message: genErr instanceof Error ? genErr.message : "Generation failed",
          })
          .eq("id", row.id);
      }

      await supabase
        .from("hook_sessions")
        .update({ status: "images_ready", updated_at: new Date().toISOString() })
        .eq("id", id);

      throw genErr;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
