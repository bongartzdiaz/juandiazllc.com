"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type AuthState } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/useT";

const initial: AuthState = { status: "idle" };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const error = params.get("error");
  const [state, formAction, pending] = useActionState(signInWithPassword, initial);
  const t = useT();

  return (
    <div className="auth-card">
      <h1>{t("login.title.a")} <em>{t("login.title.b")}</em></h1>
      <p>{t("login.lede")}</p>

      <form className="auth-form" action={formAction}>
        <label htmlFor="email">{t("login.email")}</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
          autoComplete="email"
        />

        <label htmlFor="password" style={{ marginTop: 6 }}>{t("login.password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <input type="hidden" name="next" value={next} />

        <button type="submit" disabled={pending}>
          {pending ? t("login.signing_in") : t("login.submit")} <span className="arr">→</span>
        </button>

        {state.status === "err" && state.message && (
          <div className="auth-msg err">{state.message}</div>
        )}
        {error && state.status === "idle" && (
          <div className="auth-msg err">{t("login.sso_error")}</div>
        )}
      </form>

      <div className="auth-alt">
        {t("login.footer.a")} <a href="mailto:juan@juandiazllc.com">juan@juandiazllc.com</a>
      </div>
    </div>
  );
}
