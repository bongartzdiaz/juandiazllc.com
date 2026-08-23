import { LocaleLink } from "@/components/LocaleLink";
import { getAllInsights } from "@/lib/insights";
import type { Locale } from "@/lib/i18n/dict";

// "Further reading" block for a sector page: surfaces the insights whose
// tag matches the sector, in the current locale, with localized titles.
// Feeds the previously-orphan real-estate/hospitality sector pages with
// their supporting articles and passes internal-link equity into them.
// Self-gates: returns null when the sector has no matching in-market posts
// (a sector without matching posts, or a locale with no translated ones).
//
// Note: energy keeps its own EnergyInsightLinks (market-scoped, topic-
// specific copy). This handles the all-market operator sectors.
const SECTOR_TAG: Record<string, string> = {
  "real-estate": "Real estate",
  hospitality: "Hospitality",
  // Bewust: de aangrenzende sector noemt logistiek als eerste in zijn eigen
  // samenvatting, en het logistiek-cluster is NL-only. Op /en, /de en /es
  // levert getAllInsights(locale) daar niets op, dus valt het blok vanzelf weg.
  adjacent: "Logistics",
};

const HEADING: Record<Locale, { label: string; lede: string; more: string }> = {
  en: { label: "◉ Further reading", lede: "Field notes on the failure modes we see in this sector.", more: "min" },
  nl: { label: "◉ Verder lezen", lede: "Aantekeningen uit het veld over wat er in deze sector misgaat.", more: "min" },
  de: { label: "◉ Weiterlesen", lede: "Notizen aus der Praxis zu den Fehlermustern, die wir in dieser Branche sehen.", more: "Min." },
  es: { label: "◉ Seguir leyendo", lede: "Notas de campo sobre los fallos que vemos en este sector.", more: "min" },
};

export function SectorInsightLinks({ locale, sectorSlug }: { locale: Locale; sectorSlug: string }) {
  const tag = SECTOR_TAG[sectorSlug];
  if (!tag) return null;
  const posts = getAllInsights(locale).filter((p) => p.tag === tag);
  if (posts.length === 0) return null;
  const copy = HEADING[locale];

  return (
    <aside
      aria-label={copy.label.replace(/^◉\s*/, "")}
      style={{
        marginTop: 8,
        marginBottom: 48,
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
        {copy.label}
      </div>
      <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.55, marginBottom: 18, maxWidth: "56ch" }}>
        {copy.lede}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {posts.map((p) => (
          <li key={p.slug} style={{ borderTop: "1px solid var(--line)" }}>
            <LocaleLink
              href={`/insights/${p.slug}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
                padding: "14px 0",
                textDecoration: "none",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 500, color: "var(--text)" }}>{p.title}</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {p.readingMinutes} {copy.more} →
              </span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
