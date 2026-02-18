import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: apps, error } = await supabase
      .from("apps")
      .select("*, accounts(*)")
      .order("name");

    if (error) throw error;

    return NextResponse.json({ apps: apps || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
