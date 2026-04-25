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

  // Gate protected routes. Standalone CRM: every non-public path is
  // protected. Unauthenticated hits redirect to /login?next=<path>.
  //
  // The public list is the union of three categories:
  //   1. UI routes that the user reaches before signing in (login, signup).
  //   2. Anonymous telemetry / probe endpoints (csp-report, vitals, health, log-error).
  //   3. API routes with their own out-of-band auth that doesn't use the
  //      Supabase session — Bearer secrets, HMAC signatures, OAuth state,
  //      ApiKey headers, etc. These bypass the Supabase gate but still
  //      enforce their own auth at the route handler.
  const path = request.nextUrl.pathname;
  const PUBLIC_PREFIXES = [
    "/login",
    "/signup",
    "/auth/",
    "/api/auth/",
    "/api/log-error",
    "/api/csp-report",
    "/api/vitals",
    "/api/health",
    // Out-of-band auth on API routes — each enforces its own check.
    "/api/cron/",                       // Bearer CRON_SECRET
    "/api/sms/webhook",                 // Twilio HMAC signature
    "/api/webhooks/inbound/",           // HMAC(NEXTAUTH_SECRET, ...) token
    "/api/v1/",                         // ApiKey via Authorization: Bearer
    "/api/integrations/oauth/callback", // OAuth state HMAC + state cookie
    "/_next/",
    "/favicon",
    "/robots.txt",
    "/sitemap.xml",
  ];
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));
  const isProtected = !isPublic;
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  return response;
}
