"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";

// Compact newsletter signup. Writes to Supabase `newsletter_subs`
// with source tracking. No double-opt-in for now — we're small and
// GDPR-wise a single opt-in is defensible when the signup intent is
// explicit (email + deliberate click + clear scope in the label).
// If the list ever gets big enough to migrate to Resend Audiences
// or similar, the action handler is the only thing that changes.
//
// Intentionally minimal markup so it drops into any section without
// a layout fight. Parent controls surrounding spacing.

const initial: NewsletterState = { status: "idle" };

type Props = {
  source?: string;
  compact?: boolean;
  headline?: string;
  sub?: string;
};

export function NewsletterForm({
  source = "insights_footer",
  compact = false,
  headline = "Get new insights in your inbox.",
  sub = "Monthly-ish. Field notes, no fluff, no tracking pixels. Unsubscribe in one click.",
}: Props) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initial);

  return (
    <div className={compact ? "nl-card compact" : "nl-card"}>
      {!compact && (
        <div className="nl-copy">
          <h3>{headline}</h3>
          <p>{sub}</p>
        </div>
      )}
      <form className="nl-form" action={formAction}>
        <label className="sr-only" htmlFor="nl-email">
          Email
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
        {/* Honeypot — same trick as contact form. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="nl-website">Website</label>
          <input id="nl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok" ? "Subscribed" : pending ? "…" : "Subscribe"}
        </button>
      </form>
      {state.status !== "idle" && state.message && (
        <div className={`nl-msg ${state.status}`}>{state.message}</div>
      )}
    </div>
  );
}
