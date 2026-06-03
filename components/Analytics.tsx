"use client";

import Script from "next/script";

// Plausible analytics. Cookieless, no personal data collected, aggregates
// only — under GDPR (and the Dutch Cookiewet) this does NOT require user
// consent, so we load it unconditionally when the env var is set. See
// Plausible's own DPA note:
//   https://plausible.io/data-policy
// A hard opt-out is still available via /privacy.
//
// Users who explicitly opt out write `localStorage.analytics-opt-out=1`
// (wired from the privacy page). We honour that here.
//
// Env vars:
//   NEXT_PUBLIC_PLAUSIBLE_DOMAIN — Plausible site ID (e.g. juandiazllc.com)
//   NEXT_PUBLIC_PLAUSIBLE_HOST   — custom host if self-hosted

const OPT_OUT_KEY = "analytics-opt-out";

function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const host = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? "https://plausible.io";

  if (!domain) return null;
  if (isOptedOut()) return null;

  return (
    <Script
      id="plausible"
      strategy="afterInteractive"
      data-domain={domain}
      // tagged-events variant: enables custom goal events (window.plausible(...)
      // for the contact-submit conversion, and class-based tagging for CTAs).
      src={`${host}/js/script.tagged-events.js`}
    />
  );
}
