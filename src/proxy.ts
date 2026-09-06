import { NextResponse, type NextRequest } from "next/server";

// Public routes reachable without a session.
const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password"];

// When a signed-out visitor opens a protected page (e.g. a deep link to /admin/users/new),
// send them to /login but remember where they were headed (?next=…) so the login form can
// return them there. This is a UX helper — the API and the page guards remain the real boundary.
// (Next 16 renamed the Middleware convention to Proxy; same functionality.)
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  if (req.cookies.has("uf_session")) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except API routes, Next internals, and static files (paths with a dot).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
