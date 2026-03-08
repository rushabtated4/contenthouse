import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { renderComposition } from "@/lib/ffmpeg/render-composition";
import { extractFirstFrame } from "@/lib/ffmpeg/trim";
import { join } from "path";

export const maxDuration = 300;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  try {
    // Set status to rendering
    await supabase
      .from("hook_compositions")
      .update({ status: "rendering", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", id);

    // Fetch composition with relations
    const { data: comp, error: fetchErr } = await supabase
      .from("hook_compositions")
      .select(`
        *,
        hook_generated_videos(id, video_url, session_id),
        demo_videos(*)
      `)
      .eq("id", id)
      .single();

    if (fetchErr || !comp) throw new Error("Composition not found");

    const hookVideoUrl = comp.hook_generated_videos?.video_url;
    if (!hookVideoUrl) throw new Error("Source hook video URL not found");

    // Fetch hook video buffer
    const hookRes = await fetch(hookVideoUrl);
    if (!hookRes.ok) throw new Error("Failed to download hook video");
    const hookVideoBuffer = Buffer.from(await hookRes.arrayBuffer());

    // Fetch demo video buffer if attached
    let demoVideoBuffer: Buffer | null = null;
    if (comp.demo_videos?.video_url) {
      const demoRes = await fetch(comp.demo_videos.video_url);
      if (demoRes.ok) {
        demoVideoBuffer = Buffer.from(await demoRes.arrayBuffer());
      }
    }

    // Render
    const fontDir = join(process.cwd(), "public", "fonts");
    const rendered = await renderComposition({
      hookVideoBuffer,
      textOverlays: comp.text_overlays || [],
      demoVideoBuffer,
      fontDir,
    });

    // Upload rendered video
    const fileId = crypto.randomUUID();
    const { error: uploadErr } = await supabase.storage
      .from("hook-videos")
      .upload(`compositions/${fileId}.mp4`, new Uint8Array(rendered), {
        contentType: "video/mp4",
      });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl: renderedUrl } } = supabase.storage
      .from("hook-videos")
      .getPublicUrl(`compositions/${fileId}.mp4`);

    // Extract thumbnail
    let thumbnailUrl: string | null = null;
    try {
      const thumbBuffer = await extractFirstFrame(rendered);
      const { error: thumbErr } = await supabase.storage
        .from("hook-images")
        .upload(`comp-thumbs/${fileId}.jpg`, new Uint8Array(thumbBuffer), {
          contentType: "image/jpeg",
        });
      if (!thumbErr) {
        const { data: { publicUrl } } = supabase.storage
          .from("hook-images")
          .getPublicUrl(`comp-thumbs/${fileId}.jpg`);
        thumbnailUrl = publicUrl;
      }
    } catch {
      // best-effort
    }

    // Update composition
    const { data: updated, error: updateErr } = await supabase
      .from("hook_compositions")
      .update({
        rendered_video_url: renderedUrl,
        thumbnail_url: thumbnailUrl,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Set status to failed
    await supabase
      .from("hook_compositions")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
