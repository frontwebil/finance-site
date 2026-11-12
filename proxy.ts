import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

function verifyToken(token: string) {
  const secret = process.env.ADMIN_SECRET;

  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update("admin_authenticated")
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  const isAuthenticated = token ? verifyToken(token) : false;

  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
