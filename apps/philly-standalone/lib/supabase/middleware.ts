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
