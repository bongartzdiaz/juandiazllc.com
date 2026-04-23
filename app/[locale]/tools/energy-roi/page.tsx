import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { EnergyRoi, type RoiLabels } from "@/components/calculators/EnergyRoi";

// Server wrapper for the Energy ROI calculator. Reads the translated
// `roi.*` keys via translate() and hands them to the client component
// as a plain-object prop — keeps the calculator itself locale-agnostic.

const TITLES: Record<string, string> = {
  en: "Energy ROI calculator — honest salderings-math for 2027",
  nl: "Energie-ROI-rekenmachine — eerlijke saldeer-som voor 2027",
  de: "Energie-ROI-Rechner — ehrliche Einspeise-Rechnung für 2027",
  es: "Calculadora de ROI energético — aritmética honesta del saldo 2027",
};

// BCP47 locale codes for Intl.NumberFormat / toLocaleString so a DE
// user sees "1.234 €" (de-DE), an EN/US user sees "€1,234" (en-US),
// etc. The calculator is Dutch-market specific (Saldering 2027) so
// the currency stays EUR — only the separators + symbol position
// track the viewer's locale.
const INTL_LOCALES: Record<string, string> = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const description = translate(l, "roi.lede");
  return {
    title: TITLES[l],
    description,
    alternates: buildAlternates(l, "/tools/energy-roi"),
    openGraph: {
      type: "website",
      title: TITLES[l],
      description,
      url: `/${l}/tools/energy-roi`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function EnergyRoiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const labels: RoiLabels = {
    inputs: t("roi.inputs"),
    consumption: t("roi.f.consumption"),
    systemSize: t("roi.f.systemSize"),
    systemPrice: t("roi.f.systemPrice"),
    consumerPrice: t("roi.f.consumerPrice"),
    feedInPrice: t("roi.f.feedInPrice"),
    yield: t("roi.f.yield"),
    addBattery: t("roi.f.addBattery"),
    batterySize: t("roi.f.batterySize"),
    batteryPrice: t("roi.f.batteryPrice"),
    selfConsumptionNoBat: t("roi.f.scNoBat"),
    selfConsumptionWithBat: t("roi.f.scWithBat"),
    results: t("roi.results"),
    scenarioSaldering: t("roi.sc.saldering"),
    scenarioNoBat: t("roi.sc.noBat"),
    scenarioWithBat: t("roi.sc.withBat"),
    saldSub: t("roi.sc.saldSub"),
    noBatSub: t("roi.sc.noBatSub"),
    withBatSub: t("roi.sc.withBatSub"),
    annualSavings: t("roi.annual"),
    payback: t("roi.payback"),
    deltaLabel: t("roi.delta"),
    productionLine: t("roi.production"),
    years: t("roi.years"),
    smallprint: t("roi.smallprint"),
  };

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}/tools/energy-roi` },
    { name: TITLES[l], path: `/${l}/tools/energy-roi` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("roi.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("roi.title") }} />
        <p>{t("roi.lede")}</p>
      </header>

      <section style={{ padding: "40px 40px 80px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <EnergyRoi labels={labels} localeCode={INTL_LOCALES[l] ?? "en-US"} />
      </section>

      <section style={{ padding: "40px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div
          style={{
            padding: 36,
            border: "1px solid var(--line)",
            borderRadius: 18,
            background: "linear-gradient(180deg, var(--panel), var(--bg-2))",
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono'",
              fontSize: 12,
              letterSpacing: ".14em",
              color: "var(--accent)",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            {t("roi.outro.eyebrow")}
          </div>
          <div
            style={{
              fontFamily: "'Inter'",
              fontWeight: 300,
              fontSize: "clamp(26px, 3vw, 42px)",
              letterSpacing: "-.02em",
              lineHeight: 1.15,
              marginBottom: 22,
              maxWidth: "34ch",
            }}
            dangerouslySetInnerHTML={{ __html: t("roi.outro.title") }}
          />
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65, marginBottom: 28, maxWidth: "60ch" }}>
            {t("roi.outro.body")}
          </p>
          <Link className="btn primary btn-mag" href="/contact">
            {t("roi.outro.cta")} <span className="arr">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
