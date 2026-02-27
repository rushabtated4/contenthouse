import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { uploadToStorage } from "@/lib/storage/upload";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { imageData, timestamp } = await request.json();

    if (!imageData) {
      return NextResponse.json({ error: "imageData (base64) is required" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const { url } = await uploadToStorage("hook-images", buffer, "png", "snapshots");

    const { data, error } = await supabase
      .from("hook_sessions")
      .update({
        snapshot_url: url,
        snapshot_timestamp: timestamp || 0,
        status: "snapshot_ready",
        updated_at: new Date().toISOString(),
      })
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
