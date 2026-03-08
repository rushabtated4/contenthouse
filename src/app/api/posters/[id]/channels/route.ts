import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: posterId } = await params;
    const { channelIds } = await req.json();

    if (!Array.isArray(channelIds)) {
      return NextResponse.json({ error: "Missing channelIds array" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Nullify poster_id on channels previously assigned to this poster
    await supabase
      .from("project_accounts")
      .update({ poster_id: null })
      .eq("poster_id", posterId);

    // Set poster_id on the new channel list
    if (channelIds.length > 0) {
      const { error } = await supabase
        .from("project_accounts")
        .update({ poster_id: posterId })
        .in("id", channelIds);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
