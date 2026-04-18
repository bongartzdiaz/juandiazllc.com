"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type AuthState } from "@/app/actions/auth";

const initial: AuthState = { status: "idle" };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [state, formAction, pending] = useActionState(signInWithPassword, initial);

  return (
    <div className="auth-card">
      <h1>Step into <em>Philly.</em></h1>
      <p>Sign in with the credentials Juan provided you. Same login works at juandiazllc.com.</p>

      <form className="auth-form" action={formAction}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@domain.com" required autoComplete="email" />

        <label htmlFor="password" style={{ marginTop: 6 }}>Password</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />

        <input type="hidden" name="next" value={next} />

        <button type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in →"}
        </button>

        {state.status === "err" && state.message && (
          <div className="auth-msg err">{state.message}</div>
        )}
      </form>

      <div className="auth-alt">
        Need a login? Contact <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
