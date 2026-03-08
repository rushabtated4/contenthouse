import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("hook_compositions")
      .select(`
        *,
        hook_generated_videos(id, video_url, session_id),
        demo_videos(*),
        project_accounts:channel_id(id, username, nickname, project_id, projects(id, name, color))
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("textOverlays" in body) updateData.text_overlays = body.textOverlays;
    if ("demoVideoId" in body) updateData.demo_video_id = body.demoVideoId ?? null;
    if ("reviewStatus" in body) updateData.review_status = body.reviewStatus;
    if ("channelId" in body) updateData.channel_id = body.channelId ?? null;
    if ("scheduledAt" in body) updateData.scheduled_at = body.scheduledAt ?? null;
    if ("notes" in body) updateData.notes = body.notes ?? null;
    if ("posted" in body) updateData.posted_at = body.posted ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from("hook_compositions")
      .update(updateData)
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

    // Clean up rendered video from storage if exists
    const { data: comp } = await supabase
      .from("hook_compositions")
      .select("rendered_video_url, thumbnail_url")
      .eq("id", id)
      .single();

    if (comp?.rendered_video_url) {
      const path = comp.rendered_video_url.split("/hook-videos/")[1];
      if (path) await supabase.storage.from("hook-videos").remove([path]);
    }
    if (comp?.thumbnail_url) {
      const path = comp.thumbnail_url.split("/hook-images/")[1];
      if (path) await supabase.storage.from("hook-images").remove([path]);
    }

    const { error } = await supabase
      .from("hook_compositions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
