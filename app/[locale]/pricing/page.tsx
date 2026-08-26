import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { faqSchema, productOfferSchema, type FaqItem } from "@/lib/seo/schema";
import { ogImages } from "@/lib/seo/branding";

// DEUS pricing page — 4 tiers, per-seat €40 floor, Enterprise contact-only.
// Spec lives in `_drafts/pricing/pricing-tiers-en.md`; CSV source-of-truth
// in `_drafts/pricing/pricing-tiers.csv`. When tier-data changes here,
// update both drafts to stay in sync.
//
// Server-rendered. No client state in v1 — both monthly + annual prices
// shown side-by-side per card. Toggle (monthly/annual radio) can be added
// in v2 as a client component if Juan wants tighter UX.
//
// i18n keys: `pricing.*` in `lib/i18n/dict.ts`. Tier names + CTAs are
// localized; individual feature names stay English in v1 (industry-norm
// for B2B SaaS pricing; full localization in v2 would add ~120 keys).

type TierKey = "starter" | "pro" | "business" | "enterprise";

type Tier = {
  key: TierKey;
  monthlyPrice: string | null;
  annualPrice: string | null;
  minSeats: number;
  ctaHref: string;
};

// CTAs land on /contact in beta-phase (Juan hand-onboards customers
// 1-5 via the contact form). When /signup flow ships post-customer-#1,
// switch starter/pro/business to "/signup?plan=<key>".
//
// TIERS prices + minSeats are regenerated from `_drafts/pricing/pricing-tiers.csv`
// via `npm run regen:pricing`. ctaHref values are hand-controlled (per-tier
// destination is a UX decision, not data) — de generator leest ze terug uit dit
// bestand, dus een wijziging hier overleeft een regeneratie.
//
// Alle vier de tiers wijzen naar /contact?interest=<slug>. Tot 2026-08-20 ging
// Enterprise naar een mailto op `hello@lucen.ai`, en dat kostte twee dingen:
// lucen.ai
// is een geparkeerd domein (Namecheap URL Forward naar een parking-lander, geen
// werkende HTTPS), en een mailto slaat de leadketen over — geen rij in
// marketing.leads, geen Telegram, geen spoor voorbij de Plausible-klik. Dat trof
// uitgerekend de duurste lead op de site. Zie lib/contactadressen.test.ts.
// Edit pricing in the CSV, not here.
// <BEGIN GENERATED:TIERS>
const TIERS: Tier[] = [
  { key: "starter", monthlyPrice: "€40", annualPrice: "€32", minSeats: 3, ctaHref: "/contact?interest=starter" },
  { key: "pro", monthlyPrice: "€69", annualPrice: "€55", minSeats: 5, ctaHref: "/contact?interest=pro" },
  { key: "business", monthlyPrice: "€99", annualPrice: "€79", minSeats: 10, ctaHref: "/contact?interest=business" },
  { key: "enterprise", monthlyPrice: null, annualPrice: null, minSeats: 15, ctaHref: "/contact?interest=enterprise" },
];
// <END GENERATED:TIERS>

// TODO(Juan): pick the tier that carries the "Most popular" badge.
// Default = "pro" (industry-norm). Switch to "business" to nudge upmarket.
const MOST_POPULAR_TIER: TierKey = "pro";

type Cell = string | boolean;
// labelKey is a `pricing.feat.<section>.<slug>` i18n key — see regen
// script for slug derivation. Localised in lib/i18n/dict.ts per locale.
// Cell values (e.g. "10 per entity", "Unlimited") stay raw for v1 —
// they're data, not UI text.
type FeatureRow = { labelKey: string; starter: Cell; pro: Cell; business: Cell; enterprise: Cell };
type FeatureSection = { titleKey: string; rows: FeatureRow[] };

// FEATURE_TABLE is regenerated from `_drafts/pricing/pricing-tiers.csv`
// via `npm run regen:pricing`. Do not edit by hand — edit the CSV.
// <BEGIN GENERATED:FEATURE_TABLE>
const FEATURE_TABLE: FeatureSection[] = [
  {
    titleKey: "pricing.sec.core",
    rows: [
      { labelKey: "pricing.feat.core.contacts", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.core.dealsAndPipelines", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.core.kanbanBoardsWithDueDates", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.core.notesAndFileAttachments", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.core.bulkOperations", starter: false, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.core.savedViewsAndFilters", starter: true, pro: true, business: true, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.calendar",
    rows: [
      { labelKey: "pricing.feat.calendar.calendarAndEvents", starter: true, pro: true, business: true, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.email",
    rows: [
      { labelKey: "pricing.feat.email.emailTemplates", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.email.customSmtp", starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.ai",
    rows: [
      { labelKey: "pricing.feat.ai.aiLeadScoring", starter: false, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.ai.aiContactAttributes", starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.security",
    rows: [
      { labelKey: "pricing.feat.security.twoFactorAuthentication", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.security.roleBasedAccessControl", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.security.ipAllowlist", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.security.auditLogRetention", starter: "1 year", pro: "1 year", business: "1 year", enterprise: "1 year" },
    ],
  },
  {
    titleKey: "pricing.sec.compliance",
    rows: [
      { labelKey: "pricing.feat.compliance.gdprCompliantByDefault", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.compliance.euOnlyDataResidency", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.compliance.dpaAvailableOnSignup", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.compliance.dsarExport", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.compliance.customDpaNegotiation", starter: false, pro: false, business: false, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.branding",
    rows: [
      { labelKey: "pricing.feat.branding.customLogo", starter: false, pro: true, business: true, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.integrations",
    rows: [
      { labelKey: "pricing.feat.integrations.csvImport", starter: true, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.integrations.outboundWebhooks", starter: false, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.integrations.restApiAccess", starter: false, pro: true, business: true, enterprise: true },
      { labelKey: "pricing.feat.integrations.customIntegrations", starter: false, pro: false, business: false, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.support",
    rows: [
      { labelKey: "pricing.feat.support.emailSupport", starter: true, pro: false, business: false, enterprise: false },
      { labelKey: "pricing.feat.support.priorityEmail", starter: false, pro: true, business: true, enterprise: false },
      { labelKey: "pricing.feat.support.privateSlackChannel", starter: false, pro: false, business: true, enterprise: true },
      { labelKey: "pricing.feat.support.phoneSupport", starter: false, pro: false, business: false, enterprise: true },
    ],
  },
  {
    titleKey: "pricing.sec.infrastructure",
    rows: [
      { labelKey: "pricing.feat.infrastructure.sharedMultiTenant", starter: true, pro: true, business: true, enterprise: true },
    ],
  },
];
// <END GENERATED:FEATURE_TABLE>

function renderCell(cell: Cell): string {
  if (cell === true) return "✓";
  if (cell === false) return "";
  return cell;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  const description = translate(l, "pricing.lede");
  const title = translate(l, "meta.pricing.title");
  return {
    title,
    description,
    alternates: buildAlternates(l, "/pricing"),
    openGraph: {
      images: ogImages(l),
      type: "website",
      title,
      description,
      url: `/${l}/pricing`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: t("pricing.eyebrow").replace("◉ ", ""), path: `/${l}/pricing` },
  ]);

  // Product+AggregateOffer schema — Enterprise dropped (contact-only,
  // no price → not eligible for rich-results Offer).
  const product = productOfferSchema({
    locale: l,
    productName: "DEUS",
    productDescription: t("pricing.lede"),
    tiers: TIERS.filter((tier) => tier.monthlyPrice !== null).map((tier) => ({
      name: t(`pricing.t.${tier.key}.name`),
      description: t(`pricing.t.${tier.key}.tagline`),
      priceEuro: Number(tier.monthlyPrice!.replace(/[^0-9]/g, "")),
      url: `/${l}${tier.ctaHref}`,
    })),
  });

  // FAQ schema — same 6 Q+A rendered as <details> below, plus emitted
  // as FAQPage JSON-LD so Google AI Overviews can cite directly.
  const faqs: FaqItem[] = [1, 2, 3, 4, 5, 6].map((i) => ({
    q: t(`pricing.faq.q${i}`),
    a: t(`pricing.faq.a${i}`),
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faqs)) }} />

      {/* Hero */}
      <header className="page-hero">
        <div className="eyebrow">{t("pricing.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("pricing.title") }} />
        <p>{t("pricing.lede")}</p>
      </header>

      {/* Tier cards */}
      <section style={{ padding: "40px 40px 60px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {TIERS.map((tier) => {
            const isPopular = tier.key === MOST_POPULAR_TIER;
            const tierName = t(`pricing.t.${tier.key}.name`);
            const tierTagline = t(`pricing.t.${tier.key}.tagline`);
            const tierAudience = t(`pricing.t.${tier.key}.audience`);
            const ctaLabel = t(`pricing.cta.${tier.key}`);
            return (
              <div
                key={tier.key}
                className="sec-card"
                style={{
                  minHeight: 420,
                  position: "relative",
                  borderColor: isPopular ? "var(--accent)" : undefined,
                }}
              >
                {isPopular ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 10,
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      borderRadius: 999,
                      padding: "4px 10px",
                    }}
                  >
                    {t("pricing.badge.popular")}
                  </div>
                ) : null}
                <div>
                  <div className="ix">— {tierName}</div>
                  <h4 style={{ marginTop: 14, fontSize: 22, lineHeight: 1.15 }}>{tierTagline}</h4>
                  <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>{tierAudience}</p>

                  <div style={{ marginTop: 24, marginBottom: 18, lineHeight: 1.1 }}>
                    {tier.monthlyPrice ? (
                      <>
                        <span style={{ fontSize: 36, fontWeight: 300, letterSpacing: "-.02em" }}>{tier.monthlyPrice}</span>
                        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: 6 }}>{t("pricing.label.perSeat")}</span>
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted-soft)" }}>
                          {tier.annualPrice} {t("pricing.label.perSeatAnnual")} · {t("pricing.toggle.save")}
                        </div>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-.02em" }}>{t("pricing.label.contactUs")}</span>
                      </>
                    )}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--muted-soft)", marginBottom: 18 }}>
                    {tier.minSeats} {t("pricing.label.minSeats")}
                  </div>
                </div>

                <LocaleLink
                  href={tier.ctaHref}
                  // plausible-event-* classes: click-goal tagging for the
                  // script.tagged-events.js variant (see components/Analytics.tsx).
                  className={`${isPopular ? "btn primary btn-mag" : "btn"} plausible-event-name=Pricing+CTA plausible-event-tier=${tier.key}`}
                  style={{ alignSelf: "flex-start" }}
                >
                  {ctaLabel} <span className="arr">→</span>
                </LocaleLink>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 28, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
          {t("pricing.note.contactEnterprise")}
        </p>
      </section>

      {/* Feature comparison tables, one per category */}
      <section style={{ padding: "20px 40px 80px", maxWidth: "var(--max)", margin: "0 auto" }}>
        {FEATURE_TABLE.map((section) => (
          <div key={section.titleKey} style={{ marginBottom: 36 }}>
            <h3
              style={{
                fontFamily: "'JetBrains Mono'",
                fontSize: 12,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--accent)",
                marginBottom: 12,
              }}
            >
              {t(section.titleKey)}
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                  minWidth: 600,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--muted)", fontWeight: 400 }}></th>
                    {TIERS.map((tier) => (
                      <th
                        key={tier.key}
                        style={{
                          textAlign: "center",
                          padding: "10px 8px",
                          fontWeight: 400,
                          color: tier.key === MOST_POPULAR_TIER ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {t(`pricing.t.${tier.key}.name`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--line-soft, var(--line))" }}>
                      <td style={{ padding: "10px 8px", color: "var(--text)" }}>{t(row.labelKey)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--muted)" }}>{renderCell(row.starter)}</td>
                      <td
                        style={{
                          padding: "10px 8px",
                          textAlign: "center",
                          color: MOST_POPULAR_TIER === "pro" ? "var(--accent)" : "var(--muted)",
                        }}
                      >
                        {renderCell(row.pro)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--muted)" }}>{renderCell(row.business)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "center", color: "var(--muted)" }}>{renderCell(row.enterprise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* Migration upsell */}
      <section style={{ padding: "40px 40px 60px", maxWidth: "var(--max)", margin: "0 auto" }}>
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
            {t("pricing.migration.eyebrow")}
          </div>
          <div
            style={{
              fontFamily: "'Inter'",
              fontWeight: 300,
              fontSize: "clamp(24px, 2.6vw, 36px)",
              letterSpacing: "-.02em",
              lineHeight: 1.15,
              marginBottom: 18,
              maxWidth: "34ch",
            }}
            dangerouslySetInnerHTML={{ __html: t("pricing.migration.title") }}
          />
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65, marginBottom: 24, maxWidth: "60ch" }}>
            {t("pricing.migration.body")}
          </p>
          <LocaleLink className="btn plausible-event-name=Pricing+CTA plausible-event-tier=migration" href="/contact?interest=migration">
            {t("pricing.migration.cta")} <span className="arr">→</span>
          </LocaleLink>
        </div>
      </section>

      {/* FAQ accordion — 6 questions, native <details> for crawlability + no-JS support */}
      <section style={{ padding: "40px 40px 60px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <h2
          style={{
            fontFamily: "'JetBrains Mono'",
            fontSize: 13,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 22,
          }}
        >
          {t("pricing.faq.heading")}
        </h2>
        <div className="faq-section">
          {faqs.map((item, i) => (
            <details key={i}>
              <summary>{item.q}</summary>
              <p style={{ marginTop: 10, color: "var(--muted)", lineHeight: 1.65 }}>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Outro CTA */}
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
            {t("pricing.outro.eyebrow")}
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
            dangerouslySetInnerHTML={{ __html: t("pricing.outro.title") }}
          />
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.65, marginBottom: 28, maxWidth: "60ch" }}>
            {t("pricing.outro.body")}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <LocaleLink className="btn primary btn-mag plausible-event-name=Pricing+CTA plausible-event-tier=trial" href="/contact?interest=trial">
              {t("pricing.outro.cta")} <span className="arr">→</span>
            </LocaleLink>
            <LocaleLink className="btn plausible-event-name=Pricing+CTA plausible-event-tier=sales" href="/contact?interest=sales">
              {t("pricing.outro.alt")}
            </LocaleLink>
          </div>
        </div>
      </section>
    </>
  );
}
