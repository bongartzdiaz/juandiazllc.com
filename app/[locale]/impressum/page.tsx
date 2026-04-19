import type { Metadata } from "next";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Impressum",
    description:
      "Legal notice for Juan Diaz LLC — company details, contact, and responsibility for content per German TMG §5 / EU DSA art. 12.",
    alternates: buildAlternates(l, "/impressum"),
    robots: { index: true, follow: true },
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">{t("impressum.eyebrow")}</div>
        <h1>{t("impressum.title")}</h1>
        <p>{t("impressum.lede")}</p>
      </header>
      <section
        className="long"
        style={{ padding: "20px 40px 140px", maxWidth: 760, margin: "0 auto" }}
      >
        <h2>{t("impressum.h.company")}</h2>
        <p>{t("impressum.p.company")}</p>

        <h2>{t("impressum.h.represented")}</h2>
        <p>{t("impressum.p.represented")}</p>

        <h2>{t("impressum.h.contact")}</h2>
        <p dangerouslySetInnerHTML={{ __html: t("impressum.p.contact") }} />

        <h2>{t("impressum.h.responsible")}</h2>
        <p>{t("impressum.p.responsible")}</p>

        <h2>{t("impressum.h.dispute")}</h2>
        <p dangerouslySetInnerHTML={{ __html: t("impressum.p.dispute") }} />

        <h2>{t("impressum.h.liability")}</h2>
        <p>{t("impressum.p.liability")}</p>
      </section>
    </>
  );
}
