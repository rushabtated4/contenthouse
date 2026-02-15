import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/openai/generate-image";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";
import { downloadImage } from "@/lib/storage/download";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  try {
    const { imageId } = await params;
    const supabase = createServerClient();

    // Fetch the failed image record
    const { data: image, error: imgError } = await supabase
      .from("generated_images")
      .select("*, generation_sets(*)")
      .eq("id", imageId)
      .single();

    if (imgError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.status !== "failed") {
      return NextResponse.json(
        { error: "Can only retry failed images" },
        { status: 400 }
      );
    }

    const set = image.generation_sets;

    // Get original images
    const { data: video } = await supabase
      .from("videos")
      .select("original_images")
      .eq("id", set.video_id)
      .single();

    if (!video?.original_images?.[image.slide_index]) {
      return NextResponse.json(
        { error: "Original image not found" },
        { status: 404 }
      );
    }

    // Mark as generating
    await supabase
      .from("generated_images")
      .update({ status: "generating", error_message: null })
      .eq("id", imageId);

    try {
      const originalBuffer = await downloadImage(
        video.original_images[image.slide_index]
      );

      let overlayBuffer: Buffer | undefined;
      if (image.overlay_image_url) {
        overlayBuffer = await downloadImage(image.overlay_image_url);
      }

      const prompt =
        image.per_slide_prompt ||
        (image.slide_index === 0
          ? set.first_slide_prompt
          : set.other_slides_prompt) ||
        "Recreate this image with a similar style and composition";

      const { imageBuffer } = await generateImage({
        originalImageBuffer: originalBuffer,
        prompt,
        overlayImageBuffer: overlayBuffer,
        qualityInput: set.quality_input,
        qualityOutput: set.quality_output,
        outputFormat: set.output_format,
      });

      const strippedBuffer = await stripMetadataAndResize({
        imageBuffer,
        outputFormat: set.output_format,
      });

      const { url } = await uploadToStorage(
        "generated",
        strippedBuffer,
        set.output_format,
        set.id
      );

      await supabase
        .from("generated_images")
        .update({ status: "completed", image_url: url })
        .eq("id", imageId);

      // Recheck set status
      const { data: allImages } = await supabase
        .from("generated_images")
        .select("status")
        .eq("set_id", set.id);

      const hasFailed = allImages?.some((i) => i.status === "failed");
      const newStatus = hasFailed ? "partial" : "completed";

      await supabase
        .from("generation_sets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", set.id);

      return NextResponse.json({ success: true });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("generated_images")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", imageId);

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
