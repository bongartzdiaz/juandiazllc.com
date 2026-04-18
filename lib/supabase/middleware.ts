import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
