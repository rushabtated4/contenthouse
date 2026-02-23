import { createServerClient } from "@/lib/supabase/server";
import { generateImage } from "@/lib/openai/generate-image";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";
import { downloadImage } from "@/lib/storage/download";
import { getRateLimiter } from "./rate-limiter";
import type { GenerationSet, GeneratedImage } from "@/types/database";

const BATCH_SIZE = 5;

interface ProcessBatchResult {
  processed: number;
  hasMore: boolean;
  nextBatchStart: number;
}

/**
 * Processes a batch of images for a generation set.
 * Each call handles BATCH_SIZE images, then the caller can self-chain.
 */
export async function processBatch(
  setId: string,
  batchStart: number
): Promise<ProcessBatchResult> {
  const supabase = createServerClient();
  const limiter = getRateLimiter();

  // Fetch the set config
  const { data: set, error: setError } = await supabase
    .from("generation_sets")
    .select("*")
    .eq("id", setId)
    .single();

  if (setError || !set) {
    throw new Error(`Set not found: ${setId}`);
  }

  const genSet = set as GenerationSet;

  // Update set status to processing
  if (genSet.status === "queued") {
    await supabase
      .from("generation_sets")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", setId);
  }

  // Fetch the parent video for original images
  if (!genSet.video_id) {
    await failSet(supabase, setId, "No video linked to this generation set");
    throw new Error("No video linked to this generation set");
  }

  const { data: video } = await supabase
    .from("videos")
    .select("original_images")
    .eq("id", genSet.video_id)
    .single();

  if (!video?.original_images) {
    await failSet(supabase, setId, "No original images found for video");
    throw new Error("No original images found for video");
  }

  // Get pending images for this batch
  const { data: images, error: imgError } = await supabase
    .from("generated_images")
    .select("*")
    .eq("set_id", setId)
    .eq("status", "pending")
    .order("slide_index", { ascending: true })
    .range(0, BATCH_SIZE - 1);

  if (imgError) {
    throw new Error(`Failed to fetch images: ${imgError.message}`);
  }

  if (!images || images.length === 0) {
    // No more pending images - finalize the set
    await finalizeSet(supabase, setId);
    return { processed: 0, hasMore: false, nextBatchStart: batchStart };
  }

  // Load defaults once for the batch
  const { DEFAULT_FIRST_SLIDE_PROMPT, DEFAULT_OTHER_SLIDES_PROMPT } = await import("@/lib/defaults");

  // Mark all images as generating and acquire rate limit tokens upfront
  await Promise.all(
    (images as GeneratedImage[]).map(async (img) => {
      await supabase
        .from("generated_images")
        .update({ status: "generating" })
        .eq("id", img.id);
      await limiter.acquire();
    })
  );

  // Process all images in the batch in parallel
  const results = await Promise.allSettled(
    (images as GeneratedImage[]).map(async (img) => {
      // Download original image
      const originalUrl = video.original_images[img.slide_index];
      if (!originalUrl) {
        throw new Error(`No original image at index ${img.slide_index}`);
      }
      const originalBuffer = await downloadImage(originalUrl);

      // Download overlay if present
      let overlayBuffer: Buffer | undefined;
      if (img.overlay_image_url) {
        overlayBuffer = await downloadImage(img.overlay_image_url);
      }

      // Determine prompt
      const prompt =
        img.per_slide_prompt ||
        (img.slide_index === 0
          ? (genSet.first_slide_prompt || DEFAULT_FIRST_SLIDE_PROMPT)
          : (genSet.other_slides_prompt || DEFAULT_OTHER_SLIDES_PROMPT));

      // Generate image
      const { imageBuffer } = await generateImage({
        originalImageBuffer: originalBuffer,
        prompt,
        overlayImageBuffer: overlayBuffer,
        qualityInput: genSet.quality_input as "low" | "high",
        qualityOutput: genSet.quality_output as "low" | "medium" | "high",
        outputFormat: genSet.output_format as "png" | "jpeg" | "webp",
      });

      // Strip metadata and resize to 1080x1350
      const strippedBuffer = await stripMetadataAndResize({
        imageBuffer,
        outputFormat: genSet.output_format as "png" | "jpeg" | "webp",
      });

      // Upload to storage
      const { url } = await uploadToStorage(
        "generated",
        strippedBuffer,
        genSet.output_format,
        setId
      );

      return { imgId: img.id, url };
    })
  );

  // Update DB for each result
  let processed = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const img = (images as GeneratedImage[])[i];

    if (result.status === "fulfilled") {
      await supabase
        .from("generated_images")
        .update({ status: "completed", image_url: result.value.url })
        .eq("id", img.id);
    } else {
      const err = result.reason;
      let errorMessage = "Unknown error";
      if (err instanceof Error) {
        errorMessage = err.message;
        const apiErr = err as Error & { status?: number; code?: string; type?: string };
        if (apiErr.status === 429) {
          errorMessage = "Rate limit exceeded. Will retry in next batch.";
        } else if (apiErr.status === 400 && apiErr.message?.includes("billing")) {
          errorMessage = "OpenAI billing limit reached. Please check your API key and billing settings.";
        } else if (apiErr.status === 400) {
          errorMessage = `OpenAI rejected request: ${apiErr.message}`;
        } else if (apiErr.status === 401) {
          errorMessage = "Invalid OpenAI API key. Please update your OPENAI_API_KEY.";
        }
      } else if (typeof err === "object" && err !== null) {
        errorMessage = JSON.stringify(err);
      }
      console.error(`Image ${img.id} failed:`, errorMessage);

      await supabase
        .from("generated_images")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", img.id);
    }
    processed++;
  }

  // Update progress on the set once after the batch
  await supabase
    .from("generation_sets")
    .update({
      progress_current: batchStart + processed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId);

  // Check if there are more pending images
  const { count } = await supabase
    .from("generated_images")
    .select("*", { count: "exact", head: true })
    .eq("set_id", setId)
    .eq("status", "pending");

  const hasMore = (count || 0) > 0;

  if (!hasMore) {
    await finalizeSet(supabase, setId);
  }

  return {
    processed,
    hasMore,
    nextBatchStart: batchStart + processed,
  };
}

/**
 * Mark a set as failed with an error message.
 * Called when the set encounters an unrecoverable error before image processing.
 */
async function failSet(
  supabase: ReturnType<typeof createServerClient>,
  setId: string,
  errorMessage: string
) {
  console.error(`Set ${setId} failed: ${errorMessage}`);

  // Mark all pending/generating images as failed
  await supabase
    .from("generated_images")
    .update({ status: "failed", error_message: errorMessage })
    .eq("set_id", setId)
    .in("status", ["pending", "generating"]);

  await finalizeSet(supabase, setId);
}

async function finalizeSet(
  supabase: ReturnType<typeof createServerClient>,
  setId: string
) {
  const { data: allImages } = await supabase
    .from("generated_images")
    .select("status")
    .eq("set_id", setId);

  if (!allImages) return;

  const failed = allImages.filter((i) => i.status === "failed").length;
  const completed = allImages.filter(
    (i) => i.status === "completed"
  ).length;

  let finalStatus: string;
  if (failed === allImages.length) {
    finalStatus = "failed";
  } else if (failed > 0) {
    finalStatus = "partial";
  } else {
    finalStatus = "completed";
  }

  await supabase
    .from("generation_sets")
    .update({
      status: finalStatus,
      progress_current: completed + failed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId);
}
