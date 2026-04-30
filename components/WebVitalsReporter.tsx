"use client";

import { useReportWebVitals } from "next/web-vitals";

// Fires once per Web Vitals metric (LCP, CLS, INP, FCP, TTFB, FID)
// as the browser reports it. Posts a JSON beacon to /api/vitals;
// uses sendBeacon when available so reports survive page unload.
// Zero deps beyond Next's own hook. Gated implicitly on consent —
// we only mount this component from the brand layout where the
// cookie banner already runs.

type Metric = {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
};

export function WebVitalsReporter() {
  useReportWebVitals((metric: Metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      rating: metric.rating,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      navigationType: metric.navigationType,
    });

    // Prefer sendBeacon — survives page unload, fire-and-forget.
    const url = "/api/vitals";
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }
    // Fallback — keepalive lets the request outlive the page.
    fetch(url, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => { /* best-effort */ });

    // Mirror to Sentry as a performance measurement when Sentry has
    // initialised. Lazy import keeps the bundle weight on
    // observability-enabled deploys only.
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import("@sentry/react")
        .then((Sentry) => {
          // Web-vitals values are ms (or unitless for CLS/LCP);
          // bucket the rating as a tag so dashboards can filter
          // poor-rated sessions.
          Sentry.setMeasurement?.(
            metric.name,
            metric.name === "CLS" ? metric.value : Math.round(metric.value),
            metric.name === "CLS" ? "" : "millisecond",
          );
          if (metric.rating === "poor") {
            Sentry.captureMessage(`web-vital ${metric.name} = ${metric.value} (poor)`, "info");
          }
        })
        .catch(() => { /* sdk not available, swallow */ });
    }
  });
  return null;
}
