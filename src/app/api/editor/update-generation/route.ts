import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadToStorage } from "@/lib/storage/upload";
import { renderSlide } from "@/lib/editor/render-slide";
import type { AspectRatio } from "@/lib/editor/defaults";
import type { TextBlock, OverlayImage } from "@/types/editor";

export const maxDuration = 300;

interface SlidePayload {
  editorIndex: number;
  slide: {
    backgroundUrl?: string | null;
    backgroundColor?: string | null;
    originalImageUrl?: string;
    textBlocks: TextBlock[];
    overlayImages?: OverlayImage[];
  };
}

interface RequestBody {
  setId: string;
  slides: SlidePayload[];
  outputFormat: "png" | "jpeg" | "webp";
  aspectRatio: AspectRatio;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { setId, slides, outputFormat, aspectRatio } = body;

    if (!setId || !slides?.length) {
      return NextResponse.json({ error: "setId and slides are required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch all completed generated_images for this set, ordered by slide_index
    const { data: images, error: fetchError } = await supabase
      .from("generated_images")
      .select("id, image_url, slide_index")
      .eq("set_id", setId)
      .eq("status", "completed")
      .order("slide_index", { ascending: true });

    if (fetchError) {
      return NextResponse.json({ error: "Failed to fetch images", details: fetchError.message }, { status: 500 });
    }

    if (!images?.length) {
      return NextResponse.json({ error: "No completed images found for this set" }, { status: 404 });
    }

    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const updated: { imageId: string; imageUrl: string; slideIndex: number }[] = [];

    for (const { editorIndex, slide } of slides) {
      // Pick the row at the given editor index offset
      if (editorIndex < 0 || editorIndex >= images.length) {
        console.warn(`Editor index ${editorIndex} out of range (${images.length} images), skipping`);
        continue;
      }

      const targetRow = images[editorIndex];

      // Render the slide
      const buffer = await renderSlide(slide, outputFormat, aspectRatio);
      if (!buffer) {
        console.warn(`renderSlide returned null for editor index ${editorIndex}, skipping`);
        continue;
      }

      // Upload new image
      const { url: newUrl } = await uploadToStorage("generated", buffer, ext);

      // Update the database row
      const { error: updateError } = await supabase
        .from("generated_images")
        .update({ image_url: newUrl })
        .eq("id", targetRow.id);

      if (updateError) {
        console.error(`Failed to update image ${targetRow.id}:`, updateError);
        continue;
      }

      updated.push({
        imageId: targetRow.id,
        imageUrl: newUrl,
        slideIndex: targetRow.slide_index,
      });
    }

    return NextResponse.json({ updated });
  } catch (err) {
    console.error("Update generation error:", err);
    return NextResponse.json(
      { error: "Update failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
