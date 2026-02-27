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
    const { id: sessionId } = await params;
    const { imageId } = await request.json();

    if (!imageId) {
      return NextResponse.json({ error: "imageId is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get the failed image
    const { data: image, error: imgError } = await supabase
      .from("hook_generated_images")
      .select("*")
      .eq("id", imageId)
      .eq("session_id", sessionId)
      .single();

    if (imgError) throw imgError;

    // Get session for snapshot
    const { data: session, error: sessionError } = await supabase
      .from("hook_sessions")
      .select("snapshot_url")
      .eq("id", sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session?.snapshot_url) {
      return NextResponse.json({ error: "No snapshot" }, { status: 400 });
    }

    // Mark as generating
    await supabase
      .from("hook_generated_images")
      .update({ status: "generating", error_message: null })
      .eq("id", imageId);

    const result = await generateWithNanoBanana({
      prompt: image.prompt,
      imageUrl: session.snapshot_url,
      numImages: 1,
    });

    if (result.imageUrls[0]) {
      const imgRes = await fetch(result.imageUrls[0]);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const { url } = await uploadToStorage("hook-images", imgBuffer, "png", "generated");

      const { data: updated } = await supabase
        .from("hook_generated_images")
        .update({ image_url: url, status: "completed", error_message: null })
        .eq("id", imageId)
        .select()
        .single();

      return NextResponse.json(updated);
    }

    throw new Error("No output from model");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
