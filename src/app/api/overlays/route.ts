import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerClient();

  const { data: files, error } = await supabase.storage
    .from("overlays")
    .list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out .emptyFolderPlaceholder and folders
  const overlays = (files || [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.id)
    .map((f) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("overlays").getPublicUrl(f.name);
      return { name: f.name, url: publicUrl };
    });

  return NextResponse.json({ overlays });
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const fileName = `${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from("overlays")
    .upload(fileName, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("overlays").getPublicUrl(fileName);

  return NextResponse.json({ name: fileName, url: publicUrl });
}
