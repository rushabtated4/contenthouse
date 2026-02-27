import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { getRateLimiter } from "@/lib/queue/rate-limiter";
import { downloadImage } from "@/lib/storage/download";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";
import { DEFAULT_BG_PROMPT } from "@/lib/editor/defaults";
import type { GenerateBackgroundRequest } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateBackgroundRequest = await request.json();
    const { videoId, slideIndex, prompt } = body;

    if (!videoId || slideIndex === undefined) {
      return NextResponse.json({ error: "videoId and slideIndex required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: video, error: dbError } = await supabase
      .from("videos")
      .select("original_images")
      .eq("id", videoId)
      .single();

    if (dbError || !video?.original_images || slideIndex >= video.original_images.length) {
      return NextResponse.json({ error: "Video not found or invalid slide index" }, { status: 404 });
    }

    const rateLimiter = getRateLimiter();
    await rateLimiter.acquire();

    const originalUrl = video.original_images[slideIndex];
    const originalBuffer = await downloadImage(originalUrl);

    const openai = getOpenAIClient();
    const bgPrompt = prompt || DEFAULT_BG_PROMPT;

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
      throw new Error("No image data returned from OpenAI");
    }

    const rawBuffer = Buffer.from(imageData.b64_json, "base64");
    const strippedBuffer = await stripMetadataAndResize({
      imageBuffer: rawBuffer,
      outputFormat: "png",
    });

    const { url: imageUrl } = await uploadToStorage("backgrounds", strippedBuffer, "png");

    // Create a folder for this generated background
    const now = new Date();
    const folderName = `Generated - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
    const { data: folder } = await supabase
      .from("background_folders")
      .insert({ name: folderName })
      .select("id")
      .single();

    const { data: bgRow, error: insertError } = await supabase
      .from("background_library")
      .insert({
        image_url: imageUrl,
        source: "generated",
        prompt: bgPrompt,
        source_video_id: videoId,
        width: 1080,
        height: 1350,
        folder_id: folder?.id || null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert background_library row:", insertError);
    }

    return NextResponse.json({
      imageUrl,
      libraryId: bgRow?.id || null,
      folderId: folder?.id || null,
    });
  } catch (err) {
    console.error("Generate background error:", err);
    return NextResponse.json(
      { error: "Background generation failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
