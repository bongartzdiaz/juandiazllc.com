"use client";

import { useActionState } from "react";
import { subscribe, type SubscribeState } from "@/app/actions/subscribe";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Compact newsletter signup. Writes to the `subscribers` table via
// app/actions/subscribe.ts — single opt-in, no confirmation mail.
// The double-opt-in route in app/actions/newsletter.ts, which targets
// `newsletter_subs`, is dead code: that table exists in no schema. Its
// file header records why, and why this form was pointed at
// subscribe.ts on 2026-07-21.
//
// GDPR-wise a single opt-in is defensible when the signup intent is
// explicit (email + deliberate click + clear scope in the label).
// If the list ever gets big enough to migrate to Resend Audiences
// or similar, the action handler is the only thing that changes.
//
// Intentionally minimal markup so it drops into any section without
// a layout fight. Parent controls surrounding spacing.

const initial: SubscribeState = { status: "idle" };

type Props = {
  source?: string;
  compact?: boolean;
  headline?: string;
  sub?: string;
};

export function NewsletterForm({
  source = "insights_footer",
  compact = false,
  headline,
  sub,
}: Props) {
  const [state, formAction, pending] = useActionState(subscribe, initial);
  const { locale, t } = useLocale();
  const resolvedHeadline = headline ?? t("nl.headline");
  const resolvedSub = sub ?? t("nl.sub");

  return (
    <div className={compact ? "nl-card compact" : "nl-card"}>
      {!compact && (
        <div className="nl-copy">
          <h3>{resolvedHeadline}</h3>
          <p>{resolvedSub}</p>
        </div>
      )}
      <form className="nl-form" action={formAction}>
        <label className="sr-only" htmlFor="nl-email">
          {t("nl.email")}
        </label>
        <input
          id="nl-email"
          name="email"
          type="email"
          placeholder="you@domain.com"
          required
          autoComplete="email"
          spellCheck={false}
        />
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="locale" value={locale} />
        {/* Honeypot — same trick as contact form. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="nl-website">Website</label>
          <input id="nl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok" ? t("nl.subscribed") : pending ? "…" : t("nl.submit")}
        </button>
      </form>
      {state.status !== "idle" && state.message && (
        <div className={`nl-msg ${state.status}`}>{state.message}</div>
      )}
    </div>
  );
}
