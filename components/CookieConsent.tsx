"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// GDPR cookie consent — required because the brand is NL-targeted and
// the Dutch Cookiewet mandates explicit consent for non-functional
// cookies. Stores choice in localStorage (a functional cookie, so no
// consent needed for the banner itself). Wire analytics (Plausible,
// Fathom, GA4) to read `localStorage.getItem('cookie-consent')` before
// loading.
//
// UX rules we follow:
// - Banner is dismissible via either Accept OR Decline (not a dark
//   pattern — both options are equally prominent).
// - No services load until the user chooses.
// - Defaults to hidden until we confirm no prior choice (prevents a
//   flash on every page load for repeat visitors).

const STORAGE_KEY = "cookie-consent";

type Consent = "accepted" | "declined" | null;

export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Consent;
      if (saved === "accepted" || saved === "declined") setConsent(saved);
    } catch {
      // localStorage blocked (strict privacy) — show banner and proceed.
    }
    setReady(true);
  }, []);

  function choose(value: Exclude<Consent, null>) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setConsent(value);
    // Broadcast so analytics scripts can react without a reload.
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }));
  }

  if (!ready || consent !== null) return null;

  return (
    <div role="dialog" aria-label="Cookie preferences" className="cookie-banner">
      <div className="cookie-inner">
        <div className="cookie-body">
          <strong>Cookies — quick note.</strong> This site uses a small number of
          cookies to keep auth sessions working and to understand which pages get
          read. No ad tracking, no third-party resale. Full details on the{" "}
          <Link href="/privacy">privacy page</Link>.
        </div>
        <div className="cookie-actions">
          <button
            type="button"
            className="btn ghost cookie-btn"
            onClick={() => choose("declined")}
          >
            Essential only
          </button>
          <button
            type="button"
            className="btn primary cookie-btn"
            onClick={() => choose("accepted")}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
