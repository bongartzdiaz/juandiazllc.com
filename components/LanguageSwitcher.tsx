"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dict";
import { useState, useRef, useEffect } from "react";
import { useT } from "@/lib/i18n/useT";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("lang.switch")}
        aria-expanded={open}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "inherit",
          letterSpacing: "inherit",
          textTransform: "uppercase",
          color: open ? "var(--accent)" : "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ opacity: 0.7 }}>◈</span>
        <b style={{ color: "var(--text)", fontWeight: 500 }}>{LOCALE_LABELS[locale]}</b>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            bottom: "calc(100% + 12px)",
            right: 0,
            background: "rgba(6,32,26,.92)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 6,
            minWidth: 110,
            backdropFilter: "blur(14px)",
            boxShadow: "0 20px 40px rgba(3,20,15,.6)",
            zIndex: 50,
          }}
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              role="menuitem"
              onClick={() => {
                setLocale(l as Locale);
                setOpen(false);
              }}
              style={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: l === locale ? "var(--accent)" : "var(--muted)",
                background: "transparent",
                cursor: "pointer",
                transition: "background .2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(94,255,177,.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span>{LOCALE_LABELS[l]}</span>
              {l === locale && <span>●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
