/**
 * Shim for next-auth/react — Phily uses NextAuth, we use Supabase.
 * This module exposes the same API surface so Phily components compile +
 * behave correctly while delegating to Supabase under the hood.
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [state, setState] = useState<{ data: Session; status: Status }>({
    data: null,
    status: "loading",
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) {
        setState({ data: null, status: "unauthenticated" });
        return;
      }
      setState({
        data: {
          user: {
            id: user.id,
            email: user.email ?? null,
            name:
              (user.user_metadata?.full_name as string | undefined) ??
              user.email?.split("@")[0] ??
              null,
            image: (user.user_metadata?.avatar_url as string | undefined) ?? null,
            role: (user.user_metadata?.role as string | undefined) ?? "admin",
            locale: (user.user_metadata?.preferred_locale as string | undefined) ?? "en",
            organizationId: null,
          },
        },
        status: "authenticated",
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setState({ data: null, status: "unauthenticated" });
        return;
      }
      setState({
        data: {
          user: {
            id: session.user.id,
            email: session.user.email ?? null,
            name: (session.user.user_metadata?.full_name as string | undefined) ?? null,
            image: null,
            role: "admin",
            locale: "en",
            organizationId: null,
          },
        },
        status: "authenticated",
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export async function signOut(opts?: { callbackUrl?: string }) {
  const supabase = createClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = opts?.callbackUrl ?? "/diaz/login";
  }
}

export function signIn() {
  if (typeof window !== "undefined") {
    window.location.href = "/diaz/login";
  }
}

export async function getSession(): Promise<Session> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
