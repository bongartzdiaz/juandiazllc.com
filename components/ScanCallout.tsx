import { LocaleLink } from "@/components/LocaleLink";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
import { AANTAL_WOORD_HOOFD, VRAGEN, telwoord } from "@/lib/lekkage-scan";
import { SCAN_PAD, isScanTaal } from "@/lib/lekkage-scan-taal";
import type { Locale } from "@/lib/i18n/dict";

/* Ingang naar de lekkage-scan. Zonder deze is die pagina een wees: hij staat
 * in de sitemap en er linkt niets naartoe — precies wat scripts/seo-audit.ts
 * meldde toen hij gebouwd was maar nergens hing.
 *
 * De poort leest ENKELE_TAAL, dezelfde bron waaruit de pagina zelf zijn talen
 * haalt en waarop hij buiten die talen 404't. Daarmee kan deze knop per
 * constructie geen 404 opleveren: verdwijnt of verschuift de taal van de scan,
 * dan verschuift de knop mee. Een eigen `locale === "nl"` hier zou een tweede
 * lijst zijn, en dat is de vorm waarin dit soort gaten ontstaat.
 *
 * Sinds 2026-09-20 drie talen: nl naar /tools/lekkage-scan, en en de naar
 * /tools/leak-scan. Welk pad bij welke taal hoort staat in SCAN_PAD; of dat
 * pad die taal werkelijk draagt, in ENKELE_TAAL. Spaans krijgt niets.
 *
 * Kopij hier en niet in dict.ts, om dezelfde reden als de scan zelf. Inline
 * gestyled zoals EnergyInsightLinks, zodat er geen extra afhankelijkheid op
 * globals.css bij komt. */

const KOPIJ = {
  nl: {
    eyebrow: "◉ Vier minuten",
    p:
      `${AANTAL_WOORD_HOOFD} ja/nee-vragen over je stack, en je ziet welke drie dingen ` +
      "bij jou het eerst lekken. Geen e-mail, geen verkooppraat — de uitslag staat " +
      "meteen op je scherm.",
    knop: "Doe de lekkage-scan",
  },
  en: {
    eyebrow: "◉ Four minutes",
    p:
      `${hoofd(telwoord(VRAGEN.length, "en"))} yes/no questions about your stack, and you see which three ` +
      "things leak first in your business. No email, no sales pitch — the result is " +
      "on your screen straight away.",
    knop: "Take the leak scan",
  },
  de: {
    eyebrow: "◉ Vier Minuten",
    p:
      `${hoofd(telwoord(VRAGEN.length, "de"))} Ja/Nein-Fragen zu Ihrem Stack, und Sie sehen, welche drei ` +
      "Dinge bei Ihnen zuerst lecken. Keine E-Mail, kein Verkaufsgespräch — das Ergebnis " +
      "steht sofort auf Ihrem Bildschirm.",
    knop: "Leak-Scan machen",
  },
} as const;

function hoofd(w: string): string {
  return w[0].toUpperCase() + w.slice(1);
}

export function ScanCallout({ locale }: { locale: Locale }) {
  if (!isScanTaal(locale)) return null;
  const pad = SCAN_PAD[locale];
  if (!ENKELE_TAAL[pad]?.locales.includes(locale)) return null;
  const k = KOPIJ[locale];

  return (
    <aside
      aria-label={k.knop}
      style={{
        marginTop: 48,
        padding: 28,
        border: "1px solid var(--line)",
        borderRadius: 16,
        background: "rgba(10,36,24,.4)",
      }}
    >
      <div
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: ".14em",
          color: "var(--accent)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {k.eyebrow}
      </div>
      <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 18px", maxWidth: "62ch" }}>
        {k.p}
      </p>
      <LocaleLink href={pad} className="btn">
        {k.knop}
      </LocaleLink>
    </aside>
  );
}
