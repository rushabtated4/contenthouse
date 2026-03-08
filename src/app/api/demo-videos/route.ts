import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { extractFirstFrame } from "@/lib/ffmpeg/trim";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("demo_videos")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      demos: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const title = (formData.get("title") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "mp4";

    // Upload video to hook-videos bucket under demos/ prefix
    const { error: uploadError } = await supabase.storage
      .from("hook-videos")
      .upload(`demos/${fileId}.${ext}`, new Uint8Array(buffer), {
        contentType: file.type || "video/mp4",
      });
    if (uploadError) throw uploadError;

    const { data: { publicUrl: videoUrl } } = supabase.storage
      .from("hook-videos")
      .getPublicUrl(`demos/${fileId}.${ext}`);

    // Extract thumbnail
    let thumbnailUrl: string | null = null;
    try {
      const thumbBuffer = await extractFirstFrame(buffer);
      const { error: thumbErr } = await supabase.storage
        .from("hook-images")
        .upload(`demo-thumbs/${fileId}.jpg`, new Uint8Array(thumbBuffer), {
          contentType: "image/jpeg",
        });
      if (!thumbErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("hook-images")
          .getPublicUrl(`demo-thumbs/${fileId}.jpg`);
        thumbnailUrl = publicUrl;
      }
    } catch {
      // Thumbnail extraction is best-effort
    }

    // Insert record
    const { data, error } = await supabase
      .from("demo_videos")
      .insert({
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        title,
        file_size: buffer.length,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
