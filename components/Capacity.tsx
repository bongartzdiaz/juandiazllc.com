import { BOOKING_15MIN } from "@/lib/booking";
import { translate, type Locale } from "@/lib/i18n/dict";

// Eerlijk capaciteitssignaal: hoeveel trajecten er tegelijk lopen, en hoeveel
// daarvan nog vrij zijn.
//
// DE EENHEID IS OP 2026-08-23 VERANDERD
//
// Dit blok telde vier blueprint-gesprekken per kwartaal, terwijl `/services`
// drie trajecten tegelijk noemde. Twee getallen over hetzelfde onderwerp, in
// verschillende eenheden, op naburige pagina's. Juan heeft ze gelijkgetrokken.
//
// Er is nu één capaciteitsfeit: **drie trajecten tegelijk**. Dat getal staat in
// `docs/claims.md` ("Garantie en capaciteit") en nergens anders. TOTAL_SLOTS
// wordt daar in `capacity.test.ts` tegenaan gehouden, en de bijschrifttest
// houdt de kopij aan TOTAL_SLOTS. Eén bron, twee oppervlakken — verander je het
// getal hier, dan valt de poort om tot het ook in claims.md staat.
//
// WAAROM HIER EEN DATUM BIJ STAAT
//
// `SLOTS_REMAINING` was sinds 2026-04-20 (commit 9038b9e) niet aangeraakt
// terwijl er vlak boven stond dat dit géén nep-schaarstewidget is. Vier
// maanden. Een hardgecodeerd getal dat niemand bijwerkt ís nep-schaarste,
// ongeacht de bedoeling, en het stond op /contact: precies de pagina waar de
// bezoeker beslist.
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
export const TOTAL_SLOTS = 3;
export const SLOTS_REMAINING = 3;

/**
 * Datum waarop SLOTS_REMAINING voor het laatst tegen de agenda is gehouden.
 *
 * Op 2026-08-23 heeft Juan twee dingen bevestigd: drie trajecten tegelijk (het
 * totaal, dezelfde grens die /services noemt) en alle drie op dit moment vrij.
 *
 * De vorige stand — 2 van 4 — is mét de eenheid vervallen. Die 2 telde geboekte
 * blueprint-GESPREKKEN; dit telt lopende TRAJECTEN. Een verificatie geldt voor
 * de grootheid die je gemeten hebt, niet voor het vakje waar het getal
 * toevallig in staat.
 *
 * Zet deze datum alleen bij als je het aantal werkelijk tegen de agenda hebt
 * gehouden. Een datum bijwerken zonder te kijken is exact de fout die de poort
 * moet vangen, en dan vangt hij niets meer.
 */
export const LAST_VERIFIED = "2026-08-23";

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
