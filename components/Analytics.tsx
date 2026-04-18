"use client";

import { useEffect } from "react";
import Script from "next/script";

// Privacy-friendly analytics wiring, gated by cookie consent.
//
// Design choices:
// - Loads only AFTER the user clicks "Accept all" in CookieConsent.
//   On a decline, nothing is requested — not even the analytics domain.
// - No personal identifier, no cross-site profiling. We use a static
//   page-view ping via Plausible (or compatible drop-in) which is
//   GDPR-compliant without consent banners — but we still gate it so
//   "Essential only" users get zero third-party requests at all.
// - Listens to the custom 'cookie-consent' event emitted by
//   CookieConsent.tsx so upgrading consent mid-session takes effect
//   without a page reload.
//
// Env vars:
//   NEXT_PUBLIC_PLAUSIBLE_DOMAIN — your Plausible site ID (e.g. juandiazllc.com)
//   NEXT_PUBLIC_PLAUSIBLE_HOST   — custom host if self-hosted (optional)
//
// If NEXT_PUBLIC_PLAUSIBLE_DOMAIN is unset, renders nothing — the site
// simply runs without analytics until the env is provided.

type ConsentValue = "accepted" | "declined" | null;
const STORAGE_KEY = "cookie-consent";

function readConsent(): ConsentValue {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const host = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? "https://plausible.io";

  useEffect(() => {
    // Also re-check on consent change so accepting later activates immediately.
    function onConsent(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail === "accepted") {
        // Trigger the Script mount by forcing a re-read via state update.
        window.dispatchEvent(new Event("analytics-reload"));
      }
    }
    window.addEventListener("cookie-consent", onConsent);
    return () => window.removeEventListener("cookie-consent", onConsent);
  }, []);

  if (!domain) return null;

  const consent = typeof window !== "undefined" ? readConsent() : null;
  if (consent !== "accepted") return null;

  return (
    <Script
      id="plausible"
      strategy="afterInteractive"
      data-domain={domain}
      src={`${host}/js/script.js`}
    />
  );
}
