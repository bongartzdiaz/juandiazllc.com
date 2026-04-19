"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// GDPR cookie consent — required because the brand is NL-targeted and
// the Dutch Cookiewet mandates explicit consent for non-functional
// cookies. Stores choice in localStorage (a functional cookie, so no
// consent needed for the banner itself). Wire analytics (Plausible,
// Fathom, GA4) to read `localStorage.getItem('cookie-consent')` before
// loading.

const STORAGE_KEY = "cookie-consent";

type Consent = "accepted" | "declined" | null;

export function CookieConsent() {
  const { locale, t } = useLocale();
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
    window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }));
  }

  if (!ready || consent !== null) return null;

  return (
    <div role="dialog" aria-label="Cookie preferences" className="cookie-banner">
      <div className="cookie-inner">
        <div className="cookie-body">
          {t("cookie.body")}{" "}
          <Link href={`/${locale}/privacy`}>{t("cookie.privacy")}</Link>.
        </div>
        <div className="cookie-actions">
          <button
            type="button"
            className="btn ghost cookie-btn"
            onClick={() => choose("declined")}
          >
            {t("cookie.decline")}
          </button>
          <button
            type="button"
            className="btn primary cookie-btn"
            onClick={() => choose("accepted")}
          >
            {t("cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
