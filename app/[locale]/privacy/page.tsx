import type { Metadata } from "next";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { AnalyticsOptOut } from "@/components/AnalyticsOptOut";
import { OG_IMAGES } from "@/lib/seo/branding";

// Plain-language privacy page. Not legal advice — a statement of what
// the site actually does with data, which is what NL/EU regulators
// (AP, ICO) increasingly expect over a lawyer-drafted wall of text.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.privacy.title"),
    description: translate(l, "meta.privacy.description"),
    alternates: buildAlternates(l, "/privacy"),
    robots: { index: true, follow: true },
    openGraph: {
      images: OG_IMAGES, locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">{t("priv.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("priv.title") }} />
        <p>{t("priv.lede")}</p>
      </header>
      <section
        className="long"
        style={{ padding: "20px 40px 140px", maxWidth: 760, margin: "0 auto" }}
      >
        <h2>{t("priv.h.cookies")}</h2>
        <p>{t("priv.p.cookies")}</p>

        <h2>{t("priv.h.analytics")}</h2>
        <p>{t("priv.p.analytics")}</p>
        <div style={{ margin: "20px 0 32px" }}>
          <AnalyticsOptOut />
        </div>

        <h2>{t("priv.h.contact")}</h2>
        <p>{t("priv.p.contact")}</p>

        <h2>{t("priv.h.newsletter")}</h2>
        <p>{t("priv.p.newsletter")}</p>

        <h2>{t("priv.h.rights")}</h2>
        <p dangerouslySetInnerHTML={{ __html: t("priv.p.rights") }} />

        <h2>{t("priv.h.changes")}</h2>
        <p>{t("priv.p.changes")}</p>
      </section>
    </>
  );
}
