import { LocaleLink } from "@/components/LocaleLink";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
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
 * Kopij hardgecodeerd Nederlands, om dezelfde reden als de pagina zelf: hij
 * rendert alleen op /nl. Inline gestyled zoals EnergyInsightLinks, zodat er
 * geen extra afhankelijkheid op globals.css bij komt. */

const PAD = "/tools/lekkage-scan";

export function ScanCallout({ locale }: { locale: Locale }) {
  if (!ENKELE_TAAL[PAD].locales.includes(locale)) return null;

  return (
    <aside
      aria-label="Lekkage-scan"
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
        ◉ Vier minuten
      </div>
      <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65, margin: "0 0 18px", maxWidth: "62ch" }}>
        Vijftien ja/nee-vragen over je stack, en je ziet welke drie dingen bij jou het
        eerst lekken. Geen e-mail, geen verkooppraat — de uitslag staat meteen op je
        scherm.
      </p>
      <LocaleLink href={PAD} className="btn">
        Doe de lekkage-scan
      </LocaleLink>
    </aside>
  );
}
