import Link from "next/link";
import { getAllInsights } from "@/lib/insights";
import type { Locale } from "@/lib/i18n/dict";

// Cross-links into the NL post-salderingsregeling energy insight cluster.
// Those articles are markets:["nl"] only, so this self-gates to /nl — it
// renders nothing on /en,/de,/es (where the links would 404). Mounted on
// the two highest-intent energy surfaces (the energy sector page + the ROI
// calculator) so internal-link equity flows into the cluster and readers
// get an obvious next step after "run the math". Copy is hardcoded Dutch
// because the block only ever appears on the NL locale.
export function EnergyInsightLinks({ locale }: { locale: Locale }) {
  if (locale !== "nl") return null;
  const posts = getAllInsights("nl").filter((p) => p.tag === "Energy");
  if (posts.length === 0) return null;

  return (
    <aside
      aria-label="Verder lezen over de salderingsregeling"
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
        ◉ Verder lezen
      </div>
      <div style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.55, marginBottom: 18, maxWidth: "56ch" }}>
        Alles over het einde van de salderingsregeling en wat het voor jouw rendement betekent.
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {posts.map((p) => (
          <li key={p.slug} style={{ borderTop: "1px solid var(--line)" }}>
            <Link
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
                {p.readingMinutes} min →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
