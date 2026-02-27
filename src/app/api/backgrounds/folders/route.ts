import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Get all folders
    const { data: folders, error } = await supabase
      .from("background_folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get cover image and count for each folder
    const enriched = await Promise.all(
      (folders || []).map(async (folder) => {
        const { count } = await supabase
          .from("background_library")
          .select("*", { count: "exact", head: true })
          .eq("folder_id", folder.id);

        const { data: coverRow } = await supabase
          .from("background_library")
          .select("image_url")
          .eq("folder_id", folder.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...folder,
          image_count: count || 0,
          cover_url: coverRow?.image_url || null,
        };
      })
    );

    return NextResponse.json({ folders: enriched });
  } catch (err) {
    console.error("List folders error:", err);
    return NextResponse.json({ error: "Failed to list folders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("background_folders")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, image_count: 0, cover_url: null });
  } catch (err) {
    console.error("Create folder error:", err);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
