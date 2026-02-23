import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    // Get the row first to find the storage path
    const { data: bg, error: fetchError } = await supabase
      .from("background_library")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchError || !bg) {
      return NextResponse.json({ error: "Background not found" }, { status: 404 });
    }

    // Extract storage path from URL
    const url = new URL(bg.image_url);
    const pathParts = url.pathname.split("/storage/v1/object/public/backgrounds/");
    if (pathParts[1]) {
      await supabase.storage.from("backgrounds").remove([pathParts[1]]);
    }

    // Delete DB row
    const { error: deleteError } = await supabase
      .from("background_library")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete background error:", err);
    return NextResponse.json(
      { error: "Failed to delete background" },
      { status: 500 }
    );
  }
}
