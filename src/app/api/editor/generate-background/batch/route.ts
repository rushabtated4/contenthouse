import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { getRateLimiter } from "@/lib/queue/rate-limiter";
import { downloadImage } from "@/lib/storage/download";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";
import { DEFAULT_BG_PROMPT } from "@/lib/editor/defaults";
import type { GenerateBackgroundBatchRequest } from "@/types/api";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body: GenerateBackgroundBatchRequest = await request.json();
    const { videoId, slideIndexes, prompt } = body;

    if (!videoId || !slideIndexes?.length) {
      return NextResponse.json({ error: "videoId and slideIndexes required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: video, error: dbError } = await supabase
      .from("videos")
      .select("original_images")
      .eq("id", videoId)
      .single();

    if (dbError || !video?.original_images) {
      return NextResponse.json({ error: "Video not found or no images" }, { status: 404 });
    }

    const openai = getOpenAIClient();
    const rateLimiter = getRateLimiter();
    const bgPrompt = prompt || DEFAULT_BG_PROMPT;
    const backgrounds: { slideIndex: number; imageUrl: string; libraryId: string | null }[] = [];

    for (const slideIndex of slideIndexes) {
      if (slideIndex >= video.original_images.length) continue;

      await rateLimiter.acquire();

      try {
        const originalUrl = video.original_images[slideIndex];
        const originalBuffer = await downloadImage(originalUrl);

        const originalBlob = new Blob([new Uint8Array(originalBuffer)], { type: "image/png" });
        const originalFile = new File([originalBlob], "original.png", { type: "image/png" });

        const response = await openai.images.edit({
          model: "gpt-image-1.5",
          image: [originalFile],
          prompt: bgPrompt,
          n: 1,
          size: "1024x1536",
          quality: "medium",
        });

        const imageData = response.data?.[0];
        if (!imageData?.b64_json) {
          throw new Error("No image data returned");
        }

        const rawBuffer = Buffer.from(imageData.b64_json, "base64");
        const strippedBuffer = await stripMetadataAndResize({
          imageBuffer: rawBuffer,
          outputFormat: "png",
        });

        const { url: imageUrl } = await uploadToStorage("backgrounds", strippedBuffer, "png");

        const { data: bgRow } = await supabase
          .from("background_library")
          .insert({
            image_url: imageUrl,
            source: "generated",
            prompt: bgPrompt,
            source_video_id: videoId,
            width: 1080,
            height: 1350,
          })
          .select("id")
          .single();

        backgrounds.push({
          slideIndex,
          imageUrl,
          libraryId: bgRow?.id || null,
        });
      } catch (err) {
        console.error(`Failed to generate background for slide ${slideIndex}:`, err);
        backgrounds.push({ slideIndex, imageUrl: "", libraryId: null });
      }
    }

    return NextResponse.json({ backgrounds });
  } catch (err) {
    console.error("Batch background generation error:", err);
    return NextResponse.json(
      { error: "Batch generation failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
