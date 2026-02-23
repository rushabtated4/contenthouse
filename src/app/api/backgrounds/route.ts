import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { stripMetadataAndResize } from "@/lib/metadata/strip";
import { uploadToStorage } from "@/lib/storage/upload";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    const { count } = await supabase
      .from("background_library")
      .select("*", { count: "exact", head: true });

    const { data, error } = await supabase
      .from("background_library")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    return NextResponse.json({
      backgrounds: data || [],
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error("List backgrounds error:", err);
    return NextResponse.json(
      { error: "Failed to list backgrounds" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const strippedBuffer = await stripMetadataAndResize({
      imageBuffer: buffer,
      outputFormat: "png",
    });

    const { url: imageUrl } = await uploadToStorage("backgrounds", strippedBuffer, "png");

    const supabase = createServerClient();
    const { data: bgRow, error: insertError } = await supabase
      .from("background_library")
      .insert({
        image_url: imageUrl,
        source: "uploaded",
        prompt: null,
        source_video_id: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(bgRow);
  } catch (err) {
    console.error("Upload background error:", err);
    return NextResponse.json(
      { error: "Failed to upload background" },
      { status: 500 }
    );
  }
}
