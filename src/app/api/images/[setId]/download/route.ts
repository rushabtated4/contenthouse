import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createZipFromUrls } from "@/lib/zip/create";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ setId: string }> }
) {
  try {
    const { setId } = await params;
    const supabase = createServerClient();

    // Fetch completed images for this set
    const { data: images, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("set_id", setId)
      .eq("status", "completed")
      .order("slide_index", { ascending: true });

    if (error) throw error;

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No completed images in this set" },
        { status: 404 }
      );
    }

    // Get set info for filename
    const { data: set } = await supabase
      .from("generation_sets")
      .select("set_index, output_format")
      .eq("id", setId)
      .single();

    const ext = set?.output_format || "png";

    const entries = images
      .filter((img) => img.image_url)
      .map((img, i) => ({
        url: img.image_url!,
        filename: `slide_${i + 1}.${ext}`,
      }));

    const zipBuffer = await createZipFromUrls(entries);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="carousel_set_${set?.set_index ?? 0}.zip"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
