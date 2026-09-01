"use client";

// Next.js global error boundary for the BRAND side (/, /insights, /work,
// etc.). The CRM left with #134 and lives in bongartzdiaz/DEUS-SHARED.
//
// This file runs only on unhandled React errors that escape every
// segment boundary — i.e. "the whole app caught fire." Keep the UI
// minimal (no styled-components, no fonts that might be the cause)
// and best-effort-report the error to our sink so we hear about it.

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Fire-and-forget. The sink route handles rate limiting + Sentry +
    // (optionally) a Slack ping, and will 204 on success. We don't
    // block UI on this.
    try {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          source: "brand",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "40px 20px",
          background: "#020D0A",
          color: "#E8F4EC",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: 520,
            textAlign: "center",
            padding: "36px 28px",
            border: "1px solid #103528",
            borderRadius: 16,
            background: "rgba(3, 20, 15, 0.5)",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#2EC489",
              marginBottom: 14,
            }}
          >
            ◉ System error
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Something broke on our side.
          </h1>
          <p style={{ color: "#9ABAA9", lineHeight: 1.55, margin: "0 0 24px" }}>
            We have been notified automatically. Hit retry, or head back to the homepage —
            if this keeps happening, drop a line to{" "}
            <a href="mailto:info@juandiazllc.com" style={{ color: "#2EC489" }}>
              info@juandiazllc.com
            </a>
            .
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "11px 22px",
                border: "1px solid #2EC489",
                background: "rgba(46, 196, 137, 0.1)",
                color: "#2EC489",
                borderRadius: 999,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                padding: "11px 22px",
                border: "1px solid #103528",
                color: "#E8F4EC",
                borderRadius: 999,
                textDecoration: "none",
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Go home
            </a>
          </div>
          {error.digest && (
            <div
              style={{
                marginTop: 20,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                color: "#7FA393",
              }}
            >
              ref: {error.digest}
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
