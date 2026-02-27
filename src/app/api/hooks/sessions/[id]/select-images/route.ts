import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();
    const { imageIds, selected } = await request.json();

    if (!Array.isArray(imageIds)) {
      return NextResponse.json({ error: "imageIds array is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hook_generated_images")
      .update({ selected })
      .eq("session_id", id)
      .in("id", imageIds)
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
