import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/auth";

/** Optimistic gate for /admin. Every admin action re-checks the cookie too (lib/admin-guard.ts). */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin/login"))
    return NextResponse.next();
  if (await isAdminToken(request.cookies.get(ADMIN_COOKIE)?.value))
    return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
