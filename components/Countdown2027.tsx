"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";

// Target: 1 Jan 2027, 00:00 CET (salderingsregeling phase-out).
// This is a real, externally-verifiable deadline — not a fabricated
// urgency timer. The public guide lives at /work/salderingsregeling-2027.
const TARGET = Date.UTC(2026, 11, 31, 23, 0, 0); // 00:00 CET = 23:00 UTC prev day

type Remainder = { days: number; hours: number; minutes: number; seconds: number };

function computeRemainder(now: number): Remainder {
  const diff = Math.max(0, TARGET - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

type Props = {
  variant?: "full" | "chip";
  href?: string;
};

export function Countdown2027({ variant = "full", href = "/work/salderingsregeling-2027" }: Props) {
  const t = useT();
  const [r, setR] = useState<Remainder>(() => computeRemainder(TARGET)); // SSR-safe zero-ish

  useEffect(() => {
    setR(computeRemainder(Date.now()));
    const id = setInterval(() => setR(computeRemainder(Date.now())), 1000);
    return () => clearInterval(id);
  }, []);

  if (variant === "chip") {
    return (
      <Link href={href} className="countdown-chip" aria-label={t("fomo.countdown.label")}>
        <span className="countdown-chip-dot" aria-hidden />
        <span className="countdown-chip-label">{t("fomo.countdown.label")}</span>
        <span className="countdown-chip-value">
          <span>{r.days}</span>
          <span className="countdown-chip-unit">{t("fomo.countdown.days")}</span>
          <span>{String(r.hours).padStart(2, "0")}</span>
          <span>:</span>
          <span>{String(r.minutes).padStart(2, "0")}</span>
          <span>:</span>
          <span>{String(r.seconds).padStart(2, "0")}</span>
        </span>
      </Link>
    );
  }

  return (
    <aside className="countdown-full" aria-labelledby="cd27-title">
      <div className="countdown-full-head">
        <span className="countdown-full-eyebrow">
          <span className="countdown-chip-dot" aria-hidden />
          {t("fomo.countdown.label")}
        </span>
        <span className="countdown-full-suffix">{t("fomo.countdown.suffix")}</span>
      </div>
      <div id="cd27-title" className="countdown-full-grid" role="timer" aria-live="off">
        <div className="countdown-cell">
          <span className="countdown-num">{String(r.days).padStart(3, "0")}</span>
          <span className="countdown-unit">{t("fomo.countdown.days")}</span>
        </div>
        <div className="countdown-sep" aria-hidden>·</div>
        <div className="countdown-cell">
          <span className="countdown-num">{String(r.hours).padStart(2, "0")}</span>
          <span className="countdown-unit">{t("fomo.countdown.hours")}</span>
        </div>
        <div className="countdown-sep" aria-hidden>·</div>
        <div className="countdown-cell">
          <span className="countdown-num">{String(r.minutes).padStart(2, "0")}</span>
          <span className="countdown-unit">{t("fomo.countdown.minutes")}</span>
        </div>
        <div className="countdown-sep" aria-hidden>·</div>
        <div className="countdown-cell">
          <span className="countdown-num">{String(r.seconds).padStart(2, "0")}</span>
          <span className="countdown-unit">{t("fomo.countdown.seconds")}</span>
        </div>
      </div>
      <Link href={href} className="countdown-full-cta">
        {t("fomo.countdown.cta")}
      </Link>
    </aside>
  );
}
