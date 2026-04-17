"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithMagicLink, type AuthState } from "@/app/actions/auth";

const initial: AuthState = { status: "idle" };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";
  const error = params.get("error");
  const [state, formAction, pending] = useActionState(signInWithMagicLink, initial);

  return (
    <div className="auth-card">
      <h1>Step into the <em>control room.</em></h1>
      <p>
        One email, one magic link. No passwords to remember, no apps to install. You&apos;ll be in within
        a minute.
      </p>

      <form className="auth-form" action={formAction}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
          autoComplete="email"
          disabled={state.status === "ok"}
        />
        <input type="hidden" name="next" value={next} />
        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok" ? "✓ Link sent" : pending ? "Sending..." : "Send magic link"}
        </button>

        {state.status !== "idle" && state.message && (
          <div className={`auth-msg ${state.status}`}>
            {state.message}
          </div>
        )}
        {error && state.status === "idle" && (
          <div className="auth-msg err">
            Couldn&apos;t complete the sign-in. Request a new link below.
          </div>
        )}
      </form>

      <div className="auth-alt">
        Trouble signing in? <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
