import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login pages, auth APIs, queue, and webhook endpoints
  if (
    pathname === "/login" ||
    pathname === "/posting" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/queue" ||
    pathname === "/api/poster/login" ||
    pathname === "/api/hooks/webhook"
  ) {
    return NextResponse.next();
  }

  // Poster portal routes — require ch_poster cookie
  if (pathname.startsWith("/posting/")) {
    const posterCookie = req.cookies.get("ch_poster")?.value;
    if (!posterCookie) {
      return NextResponse.redirect(new URL("/posting", req.url));
    }
    try {
      const poster = JSON.parse(posterCookie);
      // Extract username from /posting/[username]
      const urlUsername = pathname.split("/")[2];
      if (poster.username !== urlUsername) {
        return NextResponse.redirect(new URL("/posting", req.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/posting", req.url));
    }
    return NextResponse.next();
  }

  // Poster API routes — require ch_poster cookie
  if (pathname === "/api/poster/channels") {
    const posterCookie = req.cookies.get("ch_poster")?.value;
    if (!posterCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // All other routes — require admin ch_auth cookie
  const auth = req.cookies.get("ch_auth");
  if (!auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
