import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const folderId = formData.get("folderId") as string | null;
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: Array<{ id: string; image_url: string }> = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const strippedBuffer = await stripMetadataAndResize({
          imageBuffer: buffer,
          outputFormat: "png",
        });

        const { url: imageUrl } = await uploadToStorage("backgrounds", strippedBuffer, "png");

        const { data: bgRow, error: insertError } = await supabase
          .from("background_library")
          .insert({
            image_url: imageUrl,
            source: "uploaded",
            prompt: null,
            source_video_id: null,
            folder_id: folderId || null,
          })
          .select()
          .single();

        if (insertError) {
          errors.push(`${file.name}: ${insertError.message}`);
        } else {
          results.push({ id: bgRow.id, image_url: bgRow.image_url });
        }
      } catch (err) {
        errors.push(`${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      uploaded: results,
      errors,
      total: files.length,
      succeeded: results.length,
    });
  } catch (err) {
    console.error("Batch upload error:", err);
    return NextResponse.json({ error: "Failed to upload backgrounds" }, { status: 500 });
  }
}
