import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { collectionPageSchema } from "@/lib/seo/schema";

const TITLES: Record<string, string> = {
  en: "Operator calculators — honest math, no email capture",
  nl: "Operator-rekenmachines — eerlijke som, geen e-mailmuur",
  de: "Operator-Rechner — ehrliche Mathe, keine E-Mail-Mauer",
  es: "Calculadoras para operadores — matemática honesta, sin captura de email",
};

const CALCS = [
  { slug: "energy-roi", ns: "energy" },
  { slug: "peak-shift", ns: "peak" },
  { slug: "deal-cycle", ns: "cycle" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const description = translate(l, "tools.lede").replace(/<[^>]+>/g, "");
  return {
    title: TITLES[l],
    description,
    alternates: buildAlternates(l, "/tools"),
    openGraph: {
      type: "website",
      title: TITLES[l],
      description,
      url: `/${l}/tools`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function ToolsHub({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}/tools` },
  ]);

  const collection = collectionPageSchema({
    locale: l,
    path: "/tools",
    name: TITLES[l],
    description: t("tools.lede").replace(/<[^>]+>/g, ""),
    items: CALCS.map((c) => ({
      name: t(`tools.${c.ns}.title`),
      url: `/${l}/tools/${c.slug}`,
      description: t(`tools.${c.ns}.body`),
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("tools.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("tools.title") }} />
        <p>{t("tools.lede")}</p>
      </header>

      <section style={{ padding: "40px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {CALCS.map((c) => (
            <Link
              key={c.slug}
              href={`/${l}/tools/${c.slug}`}
              className="tool-card"
              style={{
                display: "block",
                padding: 28,
                border: "1px solid var(--line)",
                borderRadius: 18,
                background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
                textDecoration: "none",
                color: "var(--fg)",
                transition: "transform .2s ease, border-color .2s ease",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".14em",
                  color: "var(--accent)",
                  textTransform: "uppercase",
                  marginBottom: 14,
                }}
              >
                {t(`tools.${c.ns}.tag`)}
              </div>
              <div
                style={{
                  fontFamily: "'Inter'",
                  fontWeight: 400,
                  fontSize: 24,
                  letterSpacing: "-.02em",
                  marginBottom: 10,
                }}
              >
                {t(`tools.${c.ns}.title`)}
              </div>
              <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 18 }}>
                {t(`tools.${c.ns}.body`)}
              </p>
              <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 13, color: "var(--accent)" }}>
                {t(`tools.${c.ns}.cta`)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
