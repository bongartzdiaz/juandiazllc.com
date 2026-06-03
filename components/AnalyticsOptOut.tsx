"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";

const OPT_OUT_KEY = "analytics-opt-out";

export function AnalyticsOptOut() {
  const t = useT();
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setOptedOut(window.localStorage.getItem(OPT_OUT_KEY) === "1");
    } catch {
      setOptedOut(false);
    }
  }, []);

  if (optedOut === null) {
    return (
      <div
        style={{
          padding: "18px 20px",
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "rgba(10,36,24,.4)",
          fontSize: 14,
          color: "var(--muted-soft)",
        }}
      >
        {t("priv.optout.loading")}
      </div>
    );
  }

  const toggle = () => {
    try {
      if (optedOut) {
        window.localStorage.removeItem(OPT_OUT_KEY);
        setOptedOut(false);
      } else {
        window.localStorage.setItem(OPT_OUT_KEY, "1");
        setOptedOut(true);
      }
    } catch {
      // storage unavailable — nothing to do
    }
  };

  return (
    <div
      style={{
        padding: "20px 22px",
        border: "1px solid var(--line)",
        borderRadius: 12,
        background: "rgba(10,36,24,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 260px" }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          {optedOut ? t("priv.optout.disabled") : t("priv.optout.enabled")}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.55 }}>
          {t("priv.optout.body")}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="btn"
        style={{ whiteSpace: "nowrap" }}
        aria-pressed={optedOut}
      >
        {optedOut ? t("priv.optout.btn.enable") : t("priv.optout.btn.disable")}
      </button>
    </div>
  );
}
