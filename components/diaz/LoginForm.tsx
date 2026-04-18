"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type AuthState } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

const initial: AuthState = { status: "idle" };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const [state, formAction, pending] = useActionState(signInWithPassword, initial);

  return (
    <div className="auth-card">
      <div style={{ position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)", width: 72, height: 72, background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "50%", padding: 8, color: "var(--accent)", display: "grid", placeItems: "center", boxShadow: "0 20px 40px rgba(0,0,0,.6)" }}>
        <Logo size={56} />
      </div>
      <div style={{ marginTop: 12 }}>
        <h1>Step into <em>Command.</em></h1>
        <p>Diaz is internal-only. Sign in with the credentials Juan provided.</p>
      </div>

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
        Need access? <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
