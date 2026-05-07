import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  // When proxy.ts passes its own `requestHeaders` (nonce + request-id +
  // CSP), forward them here so `headers()` calls inside server
  // components see them. Otherwise fall through to request.headers.
  const initRequest = requestHeaders
    ? { headers: requestHeaders }
    : { headers: request.headers };
  let response = NextResponse.next({ request: initRequest });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request: initRequest });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate protected routes. Philly is the real app — any /philly/* request
  // without a Supabase session is redirected to /login?next=<path> so the
  // user comes back to where they tried to go after sign-in.
  const path = request.nextUrl.pathname;
  // Only /philly/* is the gated CRM now. /app and /dashboard were the
  // old merged-monorepo routes — removed after the Option A unification.
  const isProtected = path === "/philly" || path.startsWith("/philly/");
  // Public endpoints under /philly that uptime monitors / public webhooks
  // need to reach without a session. Add sparingly — every entry here is
  // a hole in the auth perimeter and must be self-defending (no PII in
  // response, rate-limit at the route level).
  const PUBLIC_PHILLY_PATHS = new Set<string>([
    "/philly/api/health",
    // Stripe webhook — server-to-server, no Supabase session cookie.
    // Auth is the X-Stripe-Signature header verified in the route handler.
    "/philly/api/billing/webhook",
    // Calendar push-sync webhooks — Google + Microsoft both POST here
    // without a session. Auth is the encrypted per-channel authSecret
    // (Google: X-Goog-Channel-Token, Microsoft: clientState in body).
    "/philly/api/calendar/webhook/google",
    "/philly/api/calendar/webhook/microsoft",
  ]);
  if (!user && isProtected && !PUBLIC_PHILLY_PATHS.has(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  return response;
}
