import Link from "next/link";
import { translate, type Locale } from "@/lib/i18n/dict";

// Honest capacity signal. One blueprint engagement per quarter is the
// real operating constraint — this surfaces it instead of pretending
// the calendar is infinite. Update SLOTS_REMAINING as real calendar
// state changes.
//
// This is NOT a fake scarcity widget. Don't add a timer, don't add a
// "3 people viewing right now" line, don't inflate the number.
const TOTAL_SLOTS = 4;
const SLOTS_REMAINING = 2;

type Props = {
  locale: Locale;
  variant?: "full" | "strip";
  quarter?: string; // "Q3 2026"
};

export function Capacity({ locale, variant = "full", quarter = "Q3 2026" }: Props) {
  const t = (k: string) => translate(locale, k);
  const filled = TOTAL_SLOTS - SLOTS_REMAINING;

  if (variant === "strip") {
    return (
      <div className="capacity-strip" role="status">
        <span className="capacity-strip-text">
          <strong>{quarter}</strong> — {SLOTS_REMAINING}/{TOTAL_SLOTS} {t("fomo.capacity.slotsLabel")}
        </span>
        <Link href="/contact" className="capacity-strip-cta">
          {t("fomo.capacity.cta")} →
        </Link>
      </div>
    );
  }

  return (
    <aside className="capacity-full" aria-labelledby="cap-title">
      <div className="capacity-head">
        <span className="capacity-eyebrow">
          {t("fomo.capacity.eyebrow")}
        </span>
        <span className="capacity-quarter">{quarter}</span>
      </div>
      <h3 id="cap-title" className="capacity-title">
        {t("fomo.capacity.title")}
      </h3>
      <div className="capacity-bar" aria-hidden>
        {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
          <span key={i} className={`capacity-slot ${i < filled ? "is-filled" : "is-open"}`} />
        ))}
      </div>
      <p className="capacity-slots">
        <strong>
          {SLOTS_REMAINING}/{TOTAL_SLOTS}
        </strong>{" "}
        {t("fomo.capacity.slotsLabel")}
      </p>
      <p className="capacity-note">{t("fomo.capacity.note")}</p>
      <Link href="/contact" className="capacity-cta">
        {t("fomo.capacity.cta")} →
      </Link>
    </aside>
  );
}
