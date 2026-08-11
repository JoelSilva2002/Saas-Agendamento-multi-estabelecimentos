import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "accessToken";

// Optimistic check only: presence of the cookie, no verification. Full
// session validation happens on the API side; this just avoids flashing the
// admin shell before redirecting an obviously signed-out visitor to /login.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) {
    const hasSession = request.cookies.has(ACCESS_TOKEN_COOKIE);
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/superadmin/:path*"],
};
