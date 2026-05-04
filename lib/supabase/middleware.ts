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

  // Bundle CN — no-op when Supabase isn't configured (CI smoke test,
  // marketing-only deploys, local dev without auth wired up). The
  // workflow file's comment promised this; the code didn't deliver
  // it, which 500'd every marketing page in the smoke run because
  // createServerClient throws on empty creds. /philly/* routes
  // would still need auth in this state — but they're not part of
  // the public surface, so leaving them un-gated here is fine: the
  // CRM has its own Supabase requireScope() gate that fires on
  // first request anyway.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path + (request.nextUrl.search || ""));
    return NextResponse.redirect(url);
  }

  return response;
}
