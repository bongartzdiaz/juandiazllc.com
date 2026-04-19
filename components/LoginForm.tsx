"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithPassword, type AuthState } from "@/app/actions/auth";
import { useT } from "@/lib/i18n/useT";
import { Logo } from "./Logo";

const initial: AuthState = { status: "idle" };

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/philly";
  const error = params.get("error");
  const [state, formAction, pending] = useActionState(signInWithPassword, initial);
  const t = useT();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="auth-card glass">
      {/* Brand mark */}
      <div className="auth-mark" aria-hidden style={{ color: "var(--accent)" }}>
        <Logo size={70} draw />
      </div>

      <div className="auth-eyebrow">
        <span className="dot-pulse" aria-hidden />
        <span>{t("login.eyebrow")}</span>
      </div>

      <h1>{t("login.title.a")} <em>{t("login.title.b")}</em></h1>
      <p>{t("login.lede")}</p>

      <form className="auth-form" action={formAction}>
        <div className="field">
          <label htmlFor="email">{t("login.email")}</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@domain.com"
            required
            autoComplete="email"
            spellCheck={false}
          />
        </div>

        <div className="field">
          <label htmlFor="password">{t("login.password")}</label>
          <div className="pw-wrap">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? t("login.hide_pw") : t("login.show_pw")}
              tabIndex={-1}
            >
              {showPw ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.7 21.7 0 0 1 5.17-6.11" />
                  <path d="M9.88 4.24A11 11 0 0 1 12 4c7 0 11 8 11 8a21.7 21.7 0 0 1-3.17 4.18" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <input type="hidden" name="next" value={next} />

        <button type="submit" className="auth-submit" disabled={pending}>
          <span>{pending ? t("login.signing_in") : t("login.submit")}</span>
          <span className="arr">→</span>
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
