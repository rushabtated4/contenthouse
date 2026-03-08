import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("posters")
    .select("id, username, display_name")
    .eq("username", username)
    .eq("password", password)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    poster: { id: data.id, username: data.username, displayName: data.display_name },
  });

  response.cookies.set("ch_poster", JSON.stringify({ id: data.id, username: data.username }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
