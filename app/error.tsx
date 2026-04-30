"use client";

/* Route-segment error boundary for the BRAND side. global-error.tsx
   only fires when the root layout itself throws; this one keeps the
   layout chrome (nav, footer) intact and shows the error UI inside
   the matched segment — better UX for ~95% of failures. */

import { useEffect } from "react";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "brand-segment",
          message: error?.message ?? "Unknown error",
          stack: error?.stack,
          digest: error?.digest,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* never let the error reporter itself crash */
    }
  }, [error]);

  return (
    <main
      style={{
        padding: "80px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        minHeight: "70vh",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#2EC489",
        }}
      >
        ◉ Section error
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.02em", margin: 0, textAlign: "center" }}>
        Something broke loading this page.
      </h1>
      <p style={{ color: "#9ABAA9", lineHeight: 1.55, margin: 0, maxWidth: 480, textAlign: "center" }}>
        The error has been logged automatically. Try again, or jump back to the homepage —
        if this keeps happening,{" "}
        <a href="mailto:juan@juandiazllc.com" style={{ color: "#2EC489" }}>
          let me know
        </a>
        .
      </p>
      {error?.digest ? (
        <div style={{ fontFamily: "var(--font-mono), ui-monospace, monospace", fontSize: 11, color: "#7FA393" }}>
          ref: {error.digest}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "11px 22px",
            border: "1px solid #2EC489",
            background: "rgba(46, 196, 137, 0.1)",
            color: "#2EC489",
            borderRadius: 999,
            cursor: "pointer",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
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
            color: "inherit",
            borderRadius: 999,
            textDecoration: "none",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Go home
        </a>
      </div>
    </main>
  );
}
