import type { Metadata } from "next";
import Link from "next/link";
import { getSignals } from "@/lib/signals";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { collectionPageSchema } from "@/lib/seo/schema";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.signals.title"),
    description: translate(l, "meta.signals.description"),
    alternates: buildAlternates(l, "/signals"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function SignalsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Signals", path: `/${l}/signals` },
  ]);
  const collection = collectionPageSchema({
    locale: l,
    path: "/signals",
    name: "Signals — Juan Diaz, LLC",
    description: "Short essays on designing operator tools and shipping dashboards that survive real environments.",
    items: getSignals(l).map((s) => ({
      name: s.title,
      url: `/${l}/signals/${s.slug}`,
      description: s.excerpt,
    })),
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("signals.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("signals.page.title") }} />
        <p>{t("signals.page.lede")}</p>
      </header>
      <section style={{ padding: "80px 40px 160px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {getSignals(l).map((s) => (
            <Link
              key={s.slug}
              href={`/signals/${s.slug}`}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr auto",
                gap: 32,
                padding: "32px 28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "var(--panel)",
                alignItems: "baseline",
                transition: "all .3s var(--ease)",
              }}
              data-reveal
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                {s.dateLabel}
                <div style={{ color: "var(--muted-soft)", marginTop: 6 }}>{s.readTime}</div>
              </div>
              <div>
                <h2 style={{ fontFamily: "'Inter'", fontWeight: 400, fontSize: 28, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
                  {s.title}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, maxWidth: "60ch" }}>
                  {s.excerpt}
                </p>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  color: "var(--muted-soft)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  alignSelf: "center",
                }}
              >
                {t("signals.page.read")}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
