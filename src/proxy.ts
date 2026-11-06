/**
 * Vorab-Prüfung für den Admin-Bereich: ohne Sitzungs-Cookie sofort zur Anmeldung.
 * Das ist nur eine schnelle Vorkontrolle. Die echte Prüfung (gültige Sitzung, Rolle)
 * macht jede Admin-Seite und jede Aktion selbst serverseitig.
 */
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!req.cookies.get("lv_admin")?.value) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
