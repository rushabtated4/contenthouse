import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const channelId = request.nextUrl.searchParams.get("channelId");
    const filter = request.nextUrl.searchParams.get("filter") || "all";

    let query = supabase
      .from("generation_sets")
      .select(`
        *,
        generated_images(*),
        videos:video_id(id, url, description, original_images),
        project_accounts:channel_id(id, username, nickname, project_id, projects(id, name, color))
      `)
      .not("scheduled_at", "is", null)
      .order("scheduled_at", { ascending: true });

    if (channelId) {
      query = query.eq("channel_id", channelId);
    }

    if (filter === "upcoming") {
      query = query.is("posted_at", null);
    } else if (filter === "posted") {
      query = query.not("posted_at", "is", null);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { setId, channelId, scheduledAt, notes } = await request.json();
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("generation_sets")
      .update({
        channel_id: channelId || null,
        scheduled_at: scheduledAt || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { setId, scheduledAt } = body;
    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {
      scheduled_at: scheduledAt,
      updated_at: new Date().toISOString(),
    };
    // Only mutate channel_id / notes when the client explicitly sends them
    if ("channelId" in body) updateData.channel_id = body.channelId ?? null;
    if ("notes" in body) updateData.notes = body.notes ?? null;

    const { data, error } = await supabase
      .from("generation_sets")
      .update(updateData)
      .eq("id", setId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { setId, posted } = await request.json();
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("generation_sets")
      .update({
        posted_at: posted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { setId } = await request.json();
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("generation_sets")
      .update({
        channel_id: null,
        scheduled_at: null,
        notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", setId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
