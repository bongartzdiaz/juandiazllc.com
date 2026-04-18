import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Subdomains that map to internal route folders
const SUBDOMAIN_ROUTES: Record<string, string> = {
  philly: "/philly",
  diaz: "/diaz",
};

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const subdomain = host.split(":")[0].split(".")[0];
  const pathname = request.nextUrl.pathname;

  // First: enforce auth (using the public-facing pathname for protection rules)
  const sessionResponse = await updateSession(request);

  // If session-handling decided to redirect (e.g. unauthenticated → /login), respect it
  if (sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  // Second: subdomain → internal route group rewrite
  if (subdomain in SUBDOMAIN_ROUTES) {
    const prefix = SUBDOMAIN_ROUTES[subdomain];
    if (!pathname.startsWith(prefix)) {
      const url = request.nextUrl.clone();
      url.pathname = `${prefix}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, { headers: sessionResponse.headers });
    }
  } else {
    // Apex / www — block direct access to internal subdomain folders
    if (pathname.startsWith("/philly") || pathname.startsWith("/diaz")) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
