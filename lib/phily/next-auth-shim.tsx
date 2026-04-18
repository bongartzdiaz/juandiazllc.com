/**
 * Shim for next-auth/react — Phily uses NextAuth, we use Supabase.
 *
 * Important: by the time any Phily page component renders, the parent
 * Supabase server-side layout gate in app/diaz/dashboard/layout.tsx
 * has already redirected unauthenticated users to /diaz/login. So we
 * can trust that from Phily's perspective, the user IS always signed in.
 *
 * useSession therefore returns "authenticated" immediately (no loading
 * flicker, no bogus "unauthenticated" redirect loop), then enriches the
 * session data async with the real Supabase user details.
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "authenticated" | "unauthenticated";

export type Session = {
  user?: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string | null;
    locale?: string | null;
    organizationId?: string | null;
  };
} | null;

// Accept arbitrary next-auth SessionProvider props (refetchInterval,
// refetchOnWindowFocus, basePath, etc) without enforcing schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function SessionProvider(props: any) {
  return <>{props.children}</>;
}

export function useSession(): { data: Session; status: Status } {
  // Start authenticated with a placeholder. The server-side Supabase
  // gate in the parent layout already verified a real session exists.
  const [state, setState] = useState<{ data: Session; status: Status }>({
    data: {
      user: {
        id: "",
        email: "",
        name: "operator",
        image: null,
        role: "admin",
        locale: "en",
        organizationId: null,
      },
    },
    status: "authenticated",
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      setState({
        data: {
          user: {
            id: user.id,
            email: user.email ?? null,
            name:
              (user.user_metadata?.full_name as string | undefined) ??
              user.email?.split("@")[0] ??
              "operator",
            image: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            role: (user.user_metadata?.role as string | undefined) ?? "admin",
            locale:
              (user.user_metadata?.preferred_locale as string | undefined) ?? "en",
            organizationId: null,
          },
        },
        status: "authenticated",
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export async function signOut(opts?: { callbackUrl?: string }) {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    // Rewrite /login callbacks to our actual Supabase login path
    const target =
      opts?.callbackUrl && opts.callbackUrl !== "/login"
        ? opts.callbackUrl
        : "/diaz/login";
    window.location.href = target;
  }
}

export function signIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/diaz/login";
  }
}

export async function getSession(): Promise<Session> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
      image: null,
      role: "admin",
      locale: "en",
    },
  };
}
