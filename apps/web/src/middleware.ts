import { NextRequest, NextResponse } from "next/server";

// Routes that do NOT require authentication
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/portal",
  "/offline",
  "/monitoring", // Sentry tunnel
  "/sw.js",
  "/manifest.json",
];

// API routes handled by Next.js itself (not the NestJS API)
const NEXT_INTERNALS = ["/_next", "/favicon", "/icons", "/api/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let Next.js internals through
  if (NEXT_INTERNALS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Let public paths through
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // Check for auth token in cookie (set by login page) or Authorization header
  // Note: We do NOT verify JWT signature here - that is the backend's responsibility.
  // This middleware only does lightweight route gating based on cookie presence.
  // Final authentication truth is determined by backend /auth/me endpoint.
  const token =
    req.cookies.get("tf_token")?.value ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token presence check only - backend will validate the JWT
  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
