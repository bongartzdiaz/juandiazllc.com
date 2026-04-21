import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { PeakShiftRoi, type PeakShiftLabels } from "@/components/calculators/PeakShiftRoi";

const TITLES: Record<string, string> = {
  en: "Peak-shift ROI — demand-charge arbitrage for C&I sites",
  nl: "Peak-shift-ROI — piekarbitrage voor grootverbruik",
  de: "Peak-Shift-ROI — Leistungspreis-Arbitrage für Industriekunden",
  es: "ROI de peak-shift — arbitraje del cargo por demanda para sitios industriales",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const description = translate(l, "peak.lede");
  return {
    title: TITLES[l],
    description,
    alternates: buildAlternates(l, "/tools/peak-shift"),
    openGraph: {
      type: "website",
      title: TITLES[l],
      description,
      url: `/${l}/tools/peak-shift`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function PeakShiftPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const labels: PeakShiftLabels = {
    inputs: t("peak.inputs"),
    peakKw: t("peak.f.peakKw"),
    reductionPct: t("peak.f.reductionPct"),
    demandCharge: t("peak.f.demandCharge"),
    batteryKw: t("peak.f.batteryKw"),
    batteryKwh: t("peak.f.batteryKwh"),
    batteryPrice: t("peak.f.batteryPrice"),
    cyclesPerYear: t("peak.f.cyclesPerYear"),
    peakPrice: t("peak.f.peakPrice"),
    offPeakPrice: t("peak.f.offPeakPrice"),
    roundTrip: t("peak.f.roundTrip"),
    results: t("peak.results"),
    demandSavings: t("peak.r.demandSavings"),
    arbitrageSavings: t("peak.r.arbitrageSavings"),
    totalAnnual: t("peak.r.totalAnnual"),
    payback: t("peak.r.payback"),
    years: t("peak.years"),
    smallprint: t("peak.smallprint"),
    assumptionsLine: t("peak.assumptionsLine"),
  };

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}/tools` },
    { name: TITLES[l], path: `/${l}/tools/peak-shift` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("peak.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("peak.title") }} />
        <p>{t("peak.lede")}</p>
      </header>

      <section style={{ padding: "40px 40px 80px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <PeakShiftRoi labels={labels} />
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
            {t("peak.outro.eyebrow")}
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
            dangerouslySetInnerHTML={{ __html: t("peak.outro.title") }}
          />
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65, marginBottom: 28, maxWidth: "60ch" }}>
            {t("peak.outro.body")}
          </p>
          <Link className="btn primary btn-mag" href="/contact">
            {t("peak.outro.cta")} <span className="arr">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
