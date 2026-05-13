"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signUpWithPassword, type SignupState } from "@/app/actions/signup";
import { useT } from "@/lib/i18n/useT";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Logo } from "./Logo";

/* Bundle CY — signup form.
 *
 * Mirrors LoginForm structure (same `.auth-card glass` chrome) so
 * the brand stays consistent between the two adjacent flows. Differences:
 *   - Adds name field
 *   - Adds plan badge (hidden input + visible label) from `?plan=`
 *   - Adds required consent checkbox (NEVER pre-checked per
 *     /auth-flow + /ui-form skills)
 *   - Cross-links to /login at the bottom for "already have account" */

const initial: SignupState = { status: "idle" };

const VALID_PLANS = ["operator", "team", "business"] as const;
type Plan = (typeof VALID_PLANS)[number];

export function SignupForm() {
  const params = useSearchParams();
  const planParam = params.get("plan") ?? "team";
  const plan: Plan = (VALID_PLANS as readonly string[]).includes(planParam)
    ? (planParam as Plan)
    : "team";
  const [state, formAction, pending] = useActionState(signUpWithPassword, initial);
  const t = useT();
  const { locale } = useLocale();
  const [showPw, setShowPw] = useState(false);

  return (
    <div className="auth-card glass">
      <div className="auth-mark" aria-hidden style={{ color: "var(--accent)" }}>
        <Logo size={70} draw />
      </div>

      <div className="auth-eyebrow">
        <span className="dot-pulse" aria-hidden />
        <span>{t("signup.eyebrow")}</span>
      </div>

      <h1>
        {t("signup.title.a")} <em>{t("signup.title.b")}</em>
      </h1>
      <p>{t("signup.lede")}</p>

      <div className="auth-plan-badge" aria-live="polite">
        <span className="auth-plan-label">{t("signup.planLabel")}</span>
        <span className="auth-plan-value">{t(`pricing.tier.${plan}.name`)}</span>
        <Link href={`/${locale}/pricing`} className="auth-plan-change">
          {t("signup.changePlan")}
        </Link>
      </div>

      <form className="auth-form" action={formAction}>
        <div className="field">
          <label htmlFor="signup-name">{t("signup.name")}</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            placeholder={t("signup.name.placeholder")}
            required
            autoComplete="name"
            maxLength={120}
          />
        </div>

        <div className="field">
          <label htmlFor="signup-email">{t("signup.email")}</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            placeholder="you@domain.com"
            required
            autoComplete="email"
            spellCheck={false}
            maxLength={320}
          />
        </div>

        <div className="field">
          <label htmlFor="signup-password">{t("signup.password")}</label>
          <div className="pw-wrap">
            <input
              id="signup-password"
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              minLength={8}
              maxLength={256}
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
          <div className="field-hint">{t("signup.password.hint")}</div>
        </div>

        {/* Consent — NEVER pre-checked. AVG/GDPR Art. 7. */}
        <label className="auth-consent">
          <input type="checkbox" name="consent" value="on" required />
          <span
            dangerouslySetInnerHTML={{
              __html: t("signup.consent")
                .replace(
                  /\{privacy\}/,
                  `<a href="/${locale}/privacy">${t("signup.consent.privacyLink")}</a>`,
                )
                .replace(
                  /\{terms\}/,
                  `<a href="/${locale}/impressum">${t("signup.consent.termsLink")}</a>`,
                ),
            }}
          />
        </label>

        <input type="hidden" name="plan" value={plan} />
        <input type="hidden" name="locale" value={locale} />

        <button type="submit" className="auth-submit" disabled={pending}>
          <span>{pending ? t("signup.creating") : t("signup.submit")}</span>
          <span className="arr">→</span>
        </button>

        {state.status === "err" && state.message && (
          <div className="auth-msg err">{state.message}</div>
        )}
      </form>

      <div className="auth-alt">
        {t("signup.haveAccount")}{" "}
        <Link href={`/${locale}/login`}>{t("signup.signInLink")}</Link>
      </div>
    </div>
  );
}
