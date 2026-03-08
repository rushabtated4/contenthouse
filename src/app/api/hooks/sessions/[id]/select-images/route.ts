import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { imageIds, selected, sourceImageIds } = await request.json();

    // Import images from other sessions
    if (Array.isArray(sourceImageIds) && sourceImageIds.length > 0) {
      const { data: sourceImages, error: fetchError } = await supabase
        .from("hook_generated_images")
        .select("image_url, prompt")
        .in("id", sourceImageIds)
        .eq("status", "completed")
        .not("image_url", "is", null);

      if (fetchError) throw fetchError;
      if (!sourceImages || sourceImages.length === 0) {
        return NextResponse.json({ error: "No valid source images found" }, { status: 400 });
      }

      const rows = sourceImages.map((img) => ({
        session_id: id,
        image_url: img.image_url,
        prompt: img.prompt,
        status: "completed" as const,
        selected: true,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("hook_generated_images")
        .insert(rows)
        .select();

      if (insertError) throw insertError;

      // Update session status to images_ready
      await supabase
        .from("hook_sessions")
        .update({ status: "images_ready", wizard_step: 4 })
        .eq("id", id);

      return NextResponse.json(inserted);
    }

    // Original flow: update selection on existing images
    if (!Array.isArray(imageIds)) {
      return NextResponse.json({ error: "imageIds or sourceImageIds array is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hook_generated_images")
      .update({ selected })
      .eq("session_id", id)
      .in("id", imageIds)
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
