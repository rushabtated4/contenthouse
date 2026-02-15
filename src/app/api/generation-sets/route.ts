import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = request.nextUrl;

    const status = searchParams.get("status") || "all";
    const scheduled = searchParams.get("scheduled");
    const sort = searchParams.get("sort") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("generation_sets")
      .select(
        `
        *,
        generated_images(*),
        videos:video_id(id, url, description, original_images)
      `,
        { count: "exact" }
      );

    if (status !== "all") {
      if (status.includes(",")) {
        query = query.in("status", status.split(","));
      } else {
        query = query.eq("status", status);
      }
    }

    if (scheduled === "false") {
      query = query.is("scheduled_at", null);
    } else if (scheduled === "true") {
      query = query.not("scheduled_at", "is", null);
    }

    query = query.order("created_at", {
      ascending: sort === "oldest",
    });

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;

    return NextResponse.json({
      sets: data || [],
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
