import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const setId = request.nextUrl.searchParams.get("setId");
    const videoId = request.nextUrl.searchParams.get("videoId");

    if (!setId && !videoId) {
      return NextResponse.json(
        { error: "setId or videoId is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("generation_sets")
      .select("id, editor_state");

    if (setId) {
      // Load editor state from any set (any status)
      query = query.eq("id", setId);
    } else {
      // Original behavior: find editor_draft for this video
      query = query
        .eq("video_id", videoId!)
        .eq("status", "editor_draft")
        .order("created_at", { ascending: false });
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      setId: data?.id ?? null,
      editorState: data?.editor_state ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const { videoId, setId, editorState } = body;

    if (!videoId || !editorState) {
      return NextResponse.json(
        { error: "videoId and editorState are required" },
        { status: 400 }
      );
    }

    // If setId provided, update that row directly
    if (setId) {
      const { error } = await supabase
        .from("generation_sets")
        .update({ editor_state: editorState, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (error) throw error;
      return NextResponse.json({ setId, isNew: false });
    }

    // Check for existing editor_draft for this video
    const { data: existing, error: findError } = await supabase
      .from("generation_sets")
      .select("id")
      .eq("video_id", videoId)
      .eq("status", "editor_draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      const { error } = await supabase
        .from("generation_sets")
        .update({ editor_state: editorState, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw error;
      return NextResponse.json({ setId: existing.id, isNew: false });
    }

    // Insert new editor_draft row
    const { data: inserted, error: insertError } = await supabase
      .from("generation_sets")
      .insert({
        video_id: videoId,
        title: "Editor Draft",
        set_index: 0,
        batch_id: crypto.randomUUID(),
        status: "editor_draft",
        editor_state: editorState,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ setId: inserted.id, isNew: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
