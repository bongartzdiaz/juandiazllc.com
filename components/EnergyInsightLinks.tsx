import { LocaleLink } from "@/components/LocaleLink";
import { getAllInsights } from "@/lib/insights";
import type { Locale } from "@/lib/i18n/dict";

// Cross-links into a locale's energy insight cluster. The energy clusters
// are market-scoped (NL: post-salderingsregeling; DE: Einspeisevergütung /
// Heimspeicher; ES: compensación de excedentes / autoconsumo), so this
// renders the CURRENT locale's Energy-tagged posts
// and self-gates to locales that actually have a cluster — en/es get null,
// no broken links. Mounted on the two highest-intent energy surfaces (the
// energy sector page + the ROI calculator) so internal-link equity flows
// into the cluster. Copy is per-locale; inline-styled to match the
// surrounding pages (no globals.css dependency).
const COPY: Partial<Record<Locale, { label: string; lede: string; more: string }>> = {
  nl: {
    label: "◉ Verder lezen",
    lede: "Alles over het einde van de salderingsregeling en wat het voor jouw rendement betekent.",
    more: "min",
  },
  de: {
    label: "◉ Weiterlesen",
    lede: "Alles zur sinkenden Einspeisevergütung und zur Wirtschaftlichkeit von Heimspeichern und dynamischen Tarifen.",
    more: "Min.",
  },
  es: {
    label: "◉ Seguir leyendo",
    lede: "Todo sobre la compensación de excedentes, la batería virtual y la rentabilidad real del autoconsumo.",
    more: "min",
  },
};

export function EnergyInsightLinks({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  if (!copy) return null;
  const posts = getAllInsights(locale).filter((p) => p.tag === "Energy");
  if (posts.length === 0) return null;

  return (
    <aside
      aria-label={copy.label.replace(/^◉\s*/, "")}
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
