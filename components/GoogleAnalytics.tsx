"use client";

import Script from "next/script";

// Google Analytics 4 — separate component from Plausible because the two
// have different consent requirements.
//
//   Plausible    = cookieless aggregate, loads unconditionally (legal)
//   GA4 (this)   = cookie-based, requires explicit opt-in for EU/UK visitors
//
// Implementation pattern: Consent Mode v2 — load gtag immediately with
// `denied` defaults, then bump to `granted` only when the user opts in
// via /privacy or the cookie banner. This means EU/UK visitors get the
// page-tracking-without-cookies version of GA4 by default (acceptable
// for aggregate insights without consent), and the full tracking only
// after they accept.
//
// Env var:
//   NEXT_PUBLIC_GA4_ID — measurement ID (G-XXXXXXXXXX). When unset the
//                        component renders nothing (graceful when ID is
//                        not yet provisioned for an env).

const OPT_OUT_KEY = "analytics-opt-out";

function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA4_ID;
  if (!id) return null;
  if (isOptedOut()) return null;

  return (
    <>
      <Script
        id="ga4-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){ dataLayer.push(arguments); }
          window.gtag = gtag;

          // Consent Mode v2 — default-deny for EU/UK, app code can grant later
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied',
            wait_for_update: 500,
          });

          gtag('js', new Date());
          gtag('config', '${id}', {
            anonymize_ip: true,
            allow_ad_personalization_signals: false,
            allow_google_signals: false,
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
