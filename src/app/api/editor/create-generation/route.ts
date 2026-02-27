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
    backgroundTintColor?: string | null;
    backgroundTintOpacity?: number;
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
    const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
    const created: { imageId: string; imageUrl: string; slideIndex: number }[] = [];

    for (const { editorIndex, slide } of slides) {
      const buffer = await renderSlide(slide, outputFormat, aspectRatio);
      if (!buffer) {
        console.warn(`renderSlide returned null for editor index ${editorIndex}, skipping`);
        continue;
      }

      const { url: imageUrl } = await uploadToStorage("generated", buffer, ext);

      const { data: row, error: insertError } = await supabase
        .from("generated_images")
        .insert({
          set_id: setId,
          slide_index: editorIndex,
          image_url: imageUrl,
          status: "completed",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to insert image for slide ${editorIndex}:`, insertError);
        continue;
      }

      created.push({ imageId: row.id, imageUrl, slideIndex: editorIndex });
    }

    // Update generation_sets status to completed
    await supabase
      .from("generation_sets")
      .update({
        status: "completed",
        progress_current: slides.length,
        progress_total: slides.length,
      })
      .eq("id", setId);

    return NextResponse.json({ created });
  } catch (err) {
    console.error("Create generation error:", err);
    return NextResponse.json(
      { error: "Create failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
