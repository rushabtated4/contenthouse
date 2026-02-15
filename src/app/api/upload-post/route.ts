import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadToStorage } from "@/lib/storage/upload";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFiles = formData.getAll("images") as File[];
    const title = (formData.get("title") as string) || "Uploaded Post";
    const channelId = formData.get("channelId") as string | null;
    const scheduledAt = formData.get("scheduledAt") as string | null;

    if (!imageFiles.length) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    // Validate all entries are files
    for (const file of imageFiles) {
      if (!file.type?.startsWith("image/")) {
        return NextResponse.json(
          { error: "All uploaded files must be images" },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();
    const batchId = uuidv4();
    const generatedResults: { url: string; slideIndex: number }[] = [];

    // Process each image
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const rawBuffer = Buffer.from(await file.arrayBuffer());

      // Strip metadata and resize
      const processed = await stripMetadataAndResize({
        imageBuffer: rawBuffer,
        outputFormat: "png",
      });

      // Upload processed to generated bucket
      const generated = await uploadToStorage("generated", processed, "png");
      generatedResults.push({ url: generated.url, slideIndex: i });
    }

    // Create completed generation set (no video row needed)
    const { data: genSet, error: setError } = await supabase
      .from("generation_sets")
      .insert({
        video_id: null,
        title,
        set_index: 0,
        batch_id: batchId,
        status: "completed",
        progress_current: imageFiles.length,
        progress_total: imageFiles.length,
        channel_id: channelId || null,
        scheduled_at: scheduledAt || null,
      })
      .select("id")
      .single();

    if (setError) {
      return NextResponse.json(
        { error: "Failed to create generation set", details: setError.message },
        { status: 500 }
      );
    }

    // Create generated_images rows
    const imageRows = generatedResults.map((r) => ({
      set_id: genSet.id,
      slide_index: r.slideIndex,
      status: "completed" as const,
      image_url: r.url,
    }));

    const { error: imagesError } = await supabase
      .from("generated_images")
      .insert(imageRows);

    if (imagesError) {
      return NextResponse.json(
        { error: "Failed to create image records", details: imagesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ setId: genSet.id, videoId: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Upload failed", details: message },
      { status: 500 }
    );
  }
}
