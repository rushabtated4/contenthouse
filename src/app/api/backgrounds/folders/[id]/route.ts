import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("background_folders")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Rename folder error:", err);
    return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteImages = searchParams.get("deleteImages") === "true";

    const supabase = createServerClient();

    if (deleteImages) {
      // Get all images in this folder
      const { data: images } = await supabase
        .from("background_library")
        .select("id, image_url")
        .eq("folder_id", id);

      if (images && images.length > 0) {
        // Delete from storage
        const filePaths = images
          .map((img) => {
            const url = img.image_url;
            const match = url.match(/\/backgrounds\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from("backgrounds").remove(filePaths);
        }

        // Delete DB rows
        const ids = images.map((img) => img.id);
        await supabase.from("background_library").delete().in("id", ids);
      }
    }

    // Delete the folder (ON DELETE SET NULL handles unfiling remaining images)
    const { error } = await supabase
      .from("background_folders")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete folder error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
