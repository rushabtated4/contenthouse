import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { title } = await request.json();

    const { data, error } = await supabase
      .from("demo_videos")
      .update({ title })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Get demo to find storage paths
    const { data: demo, error: fetchError } = await supabase
      .from("demo_videos")
      .select("video_url, thumbnail_url")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (demo.video_url) {
      const videoPath = demo.video_url.split("/hook-videos/")[1];
      if (videoPath) {
        await supabase.storage.from("hook-videos").remove([videoPath]);
      }
    }
    if (demo.thumbnail_url) {
      const thumbPath = demo.thumbnail_url.split("/hook-images/")[1];
      if (thumbPath) {
        await supabase.storage.from("hook-images").remove([thumbPath]);
      }
    }

    // Delete record
    const { error } = await supabase
      .from("demo_videos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
