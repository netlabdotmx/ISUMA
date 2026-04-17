import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, parseSession } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];
const PROTECTED_PREFIX = "/superinventarios";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /superinventarios/* routes
  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionValue = request.cookies.get(COOKIE_NAME)?.value;
  const user = sessionValue ? await parseSession(sessionValue) : null;

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/superinventarios/:path*"],
};
