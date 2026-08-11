import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublishableKey, getSupabaseUrl } from "./keys";

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
    getSupabaseUrl(),
    getPublishableKey(),
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

  // The call itself is the point: getUser() is what refreshes an expiring
  // token and triggers the setAll() above, which writes the rotated cookies
  // onto `response`. The user object is no longer read here — since the CRM
  // moved to DEUS-SHARED this deployment has no gated routes left, so there
  // is nothing to redirect. Dropping the call would silently stop refreshing
  // sessions for the surfaces that still read them server-side.
  await supabase.auth.getUser();

  return response;
}
