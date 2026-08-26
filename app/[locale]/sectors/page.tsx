import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { getSectors } from "@/lib/sectors";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { collectionPageSchema } from "@/lib/seo/schema";
import { ogImages } from "@/lib/seo/branding";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.sectors.title"),
    description: translate(l, "meta.sectors.description"),
    alternates: buildAlternates(l, "/sectors"),
    openGraph: {
      images: ogImages(l), locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function SectorsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const sectors = getSectors(l);
  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Sectors", path: `/${l}/sectors` },
  ]);
  const collection = collectionPageSchema({
    locale: l,
    path: "/sectors",
    name: translate(l, "meta.sectors.title"),
    description: translate(l, "meta.sectors.description"),
    items: sectors.map((s) => ({
      name: s.name,
      url: `/${l}/sectors/${s.slug}`,
      description: s.tagline,
    })),
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("sectors.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("sectors.page.title") }} />
        <p>{t("sectors.page.lede")}</p>
      </header>
      <section style={{ padding: "80px 40px 160px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {sectors.map((s) => (
            <LocaleLink key={s.slug} href={`/sectors/${s.slug}`} className="sec-card" data-reveal style={{ minHeight: 340 }}>
              <div>
                <div className="ix">— {s.name}</div>
                <h4 style={{ marginTop: 14, fontSize: 26, lineHeight: 1.12 }}>{s.tagline}</h4>
                <p>{s.summary.length > 180 ? s.summary.slice(0, 180) + "…" : s.summary}</p>
              </div>
              <div className="tags">
                {s.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </LocaleLink>
          ))}
        </div>
      </section>
    </>
  );
}
