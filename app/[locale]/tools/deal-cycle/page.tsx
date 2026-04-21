import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { DealCycleRoi, type DealCycleLabels } from "@/components/calculators/DealCycleRoi";

const TITLES: Record<string, string> = {
  en: "Deal-cycle ROI — what a shorter sales cycle is worth",
  nl: "Deal-cycle-ROI — wat een kortere verkoopcyclus oplevert",
  de: "Deal-Cycle-ROI — was ein kürzerer Vertriebszyklus bringt",
  es: "ROI del ciclo de venta — cuánto vale un ciclo más corto",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const description = translate(l, "cycle.lede");
  return {
    title: TITLES[l],
    description,
    alternates: buildAlternates(l, "/tools/deal-cycle"),
    openGraph: {
      type: "website",
      title: TITLES[l],
      description,
      url: `/${l}/tools/deal-cycle`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function DealCyclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const labels: DealCycleLabels = {
    inputs: t("cycle.inputs"),
    reps: t("cycle.f.reps"),
    dealsPerRep: t("cycle.f.dealsPerRep"),
    avgDealValue: t("cycle.f.avgDealValue"),
    grossMarginPct: t("cycle.f.grossMarginPct"),
    winRate: t("cycle.f.winRate"),
    baselineCycleDays: t("cycle.f.baselineCycleDays"),
    newCycleDays: t("cycle.f.newCycleDays"),
    crmInvestment: t("cycle.f.crmInvestment"),
    results: t("cycle.results"),
    baselineRevenue: t("cycle.r.baselineRevenue"),
    newRevenue: t("cycle.r.newRevenue"),
    extraRevenue: t("cycle.r.extraRevenue"),
    extraMargin: t("cycle.r.extraMargin"),
    netYearOne: t("cycle.r.netYearOne"),
    paybackMonths: t("cycle.r.paybackMonths"),
    months: t("cycle.months"),
    velocityLine: t("cycle.velocityLine"),
    smallprint: t("cycle.smallprint"),
  };

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Tools", path: `/${l}/tools` },
    { name: TITLES[l], path: `/${l}/tools/deal-cycle` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("cycle.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("cycle.title") }} />
        <p>{t("cycle.lede")}</p>
      </header>

      <section style={{ padding: "40px 40px 80px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <DealCycleRoi labels={labels} />
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
            {t("cycle.outro.eyebrow")}
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
            dangerouslySetInnerHTML={{ __html: t("cycle.outro.title") }}
          />
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65, marginBottom: 28, maxWidth: "60ch" }}>
            {t("cycle.outro.body")}
          </p>
          <Link className="btn primary btn-mag" href="/contact">
            {t("cycle.outro.cta")} <span className="arr">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
