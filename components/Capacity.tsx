import { LocaleLink } from "@/components/LocaleLink";
import { translate, type Locale } from "@/lib/i18n/dict";

// Eerlijk capaciteitssignaal: vier blueprint-opdrachten per kwartaal, en
// hoeveel daarvan nog vrij zijn.
//
// WAAROM HIER EEN DATUM BIJ STAAT
//
// Tot 2026-08-19 stond hier `SLOTS_REMAINING = 2` met daarboven de belofte
// dat dit géén nep-schaarstewidget is. Dat getal was sinds 2026-04-20
// (commit 9038b9e) niet aangeraakt — vier maanden. Een hardgecodeerd getal
// dat niemand bijwerkt ís nep-schaarste, ongeacht de bedoeling, en het stond
// op /contact: precies de pagina waar de bezoeker beslist.
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
 * Staat bewust op de dag dat het getal werkelijk is gezet (2026-04-20), niet op
 * vandaag. Juan heeft op 2026-08-19 bevestigd dat er VIER plekken per kwartaal
 * zijn — het totaal. Hoeveel er nu nog vrij zijn is niet nagekeken, dus een
 * verse stempel zetten zou precies de fout herhalen die deze poort moet vangen.
 *
 * Gevolg: `capacity.test.ts` is rood tot iemand het echte aantal invult en deze
 * datum bijwerkt. Dat is de bedoeling, geen defect.
 */
export const LAST_VERIFIED = "2026-04-20";

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
        <LocaleLink href="/contact" className="capacity-strip-cta">
          {t("fomo.capacity.cta")} →
        </LocaleLink>
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
      <LocaleLink href="/contact" className="capacity-cta">
        {t("fomo.capacity.cta")} →
      </LocaleLink>
    </aside>
  );
}
