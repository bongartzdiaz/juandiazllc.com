import { BOOKING_15MIN } from "@/lib/booking";
import { translate, type Locale } from "@/lib/i18n/dict";

// Eerlijk capaciteitssignaal: vier blueprint-opdrachten per kwartaal, en
// hoeveel daarvan nog vrij zijn.
//
// WAAROM HIER EEN DATUM BIJ STAAT
//
// `SLOTS_REMAINING = 2` was sinds 2026-04-20 (commit 9038b9e) niet aangeraakt
// terwijl er vlak boven stond dat dit géén nep-schaarstewidget is. Vier
// maanden. Een hardgecodeerd getal dat niemand bijwerkt ís nep-schaarste,
// ongeacht de bedoeling, en het stond op /contact: precies de pagina waar de
// bezoeker beslist.
//
// Op 2026-08-19 nagekeken: het was toevallig nog steeds 2. Dat maakt het geen
// vals signaal geweest — maar wel een ongecontroleerd signaal, en dat is een
// kwestie van geluk, niet van beleid. Vandaar de datum hieronder.
//
// De bijschrift-tekst zei bovendien "één blueprint per kwartaal" terwijl de
// balk er vier tekende. Eén van de twee moest weg; vier is de werkelijke
// grens, dus de tekst is aangepast (fomo.capacity.note, vier talen).
//
// LAST_VERIFIED is de reparatie: `capacity.test.ts` wordt rood zodra deze
// datum ouder is dan MAX_AGE_DAYS. Dat dwingt een aanraking, en een
// aanraking dwingt een commit, en een commit dwingt een herbouw — wat
// tegelijk het kwartaal hieronder vers houdt, want dat wordt bij het bouwen
// afgeleid en zou anders op een statische pagina blijven staan.
//
// Dit is GEEN nep-schaarstewidget en moet dat blijven. Geen timer, geen
// "3 mensen kijken nu", en SLOTS_REMAINING nooit lager zetten dan waar de
// agenda werkelijk staat.
export const TOTAL_SLOTS = 4;
export const SLOTS_REMAINING = 2;

/**
 * Datum waarop SLOTS_REMAINING voor het laatst tegen de agenda is gehouden.
 *
 * Juan heeft op 2026-08-19 twee dingen bevestigd: vier plekken per kwartaal
 * (het totaal) en twee daarvan nog vrij. Daarvóór stond hier 2026-04-20 — het
 * getal was 121 dagen niet aangeraakt terwijl het commentaar hierboven volhield
 * dat dit geen nep-schaarste is.
 *
 * Zet deze datum alleen bij als je het aantal werkelijk tegen de agenda hebt
 * gehouden. Een datum bijwerken zonder te kijken is exact de fout die de poort
 * moet vangen, en dan vangt hij niets meer.
 */
export const LAST_VERIFIED = "2026-08-19";

/** Zoveel dagen mag LAST_VERIFIED oud zijn voordat de poort rood wordt. */
export const MAX_AGE_DAYS = 30;

/**
 * Kwartaallabel uit een datum, bv. "Q3 2026".
 *
 * Stond hier eerder als vaste default `"Q3 2026"` in de props, en geen enkele
 * aanroeper gaf hem mee — dus élke render toonde dat, ook na 1 oktober.
 */
export function quarterLabel(d: Date): string {
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

type Props = {
  locale: Locale;
  variant?: "full" | "strip";
  /** Alleen meegeven om een ander kwartaal te tonen dan het huidige. */
  quarter?: string;
};

export function Capacity({ locale, variant = "full", quarter }: Props) {
  const t = (k: string) => translate(locale, k);
  const label = quarter ?? quarterLabel(new Date());
  const filled = TOTAL_SLOTS - SLOTS_REMAINING;

  if (variant === "strip") {
    return (
      <div className="capacity-strip" role="status">
        <span className="capacity-dot" aria-hidden />
        <span className="capacity-strip-text">
          <strong>{label}</strong> — {SLOTS_REMAINING}/{TOTAL_SLOTS} {t("fomo.capacity.slotsLabel")}
        </span>
        <a
          href={BOOKING_15MIN}
          target="_blank"
          rel="noopener noreferrer"
          className="capacity-strip-cta plausible-event-name=Boeking+15min"
        >
          {t("cta.intro")} →
        </a>
      </div>
    );
  }

  return (
    <aside className="capacity-full" aria-labelledby="cap-title">
      <div className="capacity-head">
        <span className="capacity-eyebrow">
          <span className="capacity-dot" aria-hidden />
          {t("fomo.capacity.eyebrow")}
        </span>
        <span className="capacity-quarter">{label}</span>
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
      <a
        href={BOOKING_15MIN}
        target="_blank"
        rel="noopener noreferrer"
        className="capacity-cta plausible-event-name=Boeking+15min"
      >
        {t("cta.intro")} →
      </a>
    </aside>
  );
}
