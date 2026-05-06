import type { Metadata } from "next";
import Link from "next/link";
import { FaqSection } from "@/components/FaqSection";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { faqSchema, pricingPlanSchema } from "@/lib/seo/schema";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { getPricingFaq } from "@/lib/seo/faqs";

/* Bundle CV — pricing page.
 * Three product tiers + Enterprise contact-us. Prices are placeholders
 * the operator can move once Stripe price IDs are wired in Bundle CX.
 * The marketing-side renders this statically; signup is a separate
 * route (Bundle CY) that consumes the chosen tier via ?plan=… */

const TIERS = ["operator", "team", "business"] as const;
type Tier = typeof TIERS[number];

const PRICES: Record<Tier, string> = {
  operator: "€49",
  team:     "€199",
  business: "€599",
};

// Featured tier gets the accent ring + ribbon. Mirrors what most SaaS
// price pages do; helps the eye land on the recommended option.
const FEATURED: Tier = "team";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "pricing.meta.title"),
    description: translate(l, "pricing.meta.desc"),
    alternates: buildAlternates(l, "/pricing"),
    openGraph: {
      type: "website",
      title: translate(l, "pricing.meta.title"),
      description: translate(l, "pricing.meta.desc"),
      url: `/${l}/pricing`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Pricing", path: `/${l}/pricing` },
  ]);
  const faq = getPricingFaq(l);

  // Bundle DA — pricing-tier rich-result markup so Google can render
  // the per-plan price chip and Perplexity can quote the price line
  // without scraping the page. Mirrors the tier table above; if you
  // change a price, update both.
  const pricingSchema = pricingPlanSchema({
    locale: l,
    productName: "Philly CRM",
    productDescription: t("pricing.meta.desc"),
    tiers: [
      { id: "operator", name: t("pricing.tier.operator.name"), priceEur:  49, description: t("pricing.tier.operator.blurb") },
      { id: "team",     name: t("pricing.tier.team.name"),     priceEur: 199, description: t("pricing.tier.team.blurb") },
      { id: "business", name: t("pricing.tier.business.name"), priceEur: 599, description: t("pricing.tier.business.blurb") },
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faq)) }}
      />

      <header className="page-hero">
        <div className="eyebrow">{t("pricing.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("pricing.page.title") }} />
        <p>{t("pricing.page.lede")}</p>
      </header>

      <section className="pricing-grid" aria-label={t("pricing.page.eyebrow")}>
        {TIERS.map((tier) => (
          <article
            key={tier}
            id={`tier-${tier}`}
            className={`pricing-tier ${tier === FEATURED ? "is-featured" : ""}`}
          >
            {tier === FEATURED && (
              <div className="pricing-ribbon">{t("pricing.featured")}</div>
            )}
            <div className="pricing-tier-name">{t(`pricing.tier.${tier}.name`)}</div>
            <div className="pricing-tier-price">
              <span className="amount">{PRICES[tier]}</span>
              <span className="period">{t("pricing.period")}</span>
            </div>
            <p className="pricing-tier-blurb">{t(`pricing.tier.${tier}.blurb`)}</p>
            <ul className="pricing-tier-features">
              {[1, 2, 3, 4, 5, 6].map((i) => {
                const key = `pricing.tier.${tier}.f${i}`;
                const text = t(key);
                if (text === key) return null;
                return <li key={i}>{text}</li>;
              })}
            </ul>
            <Link
              href={`/${l}/signup?plan=${tier}`}
              className="btn pricing-tier-cta"
            >
              {t(`pricing.tier.${tier}.cta`)}
            </Link>
          </article>
        ))}

        <article className="pricing-tier pricing-tier-enterprise">
          <div className="pricing-tier-name">{t("pricing.tier.enterprise.name")}</div>
          <div className="pricing-tier-price">
            <span className="amount">{t("pricing.tier.enterprise.price")}</span>
          </div>
          <p className="pricing-tier-blurb">{t("pricing.tier.enterprise.blurb")}</p>
          <ul className="pricing-tier-features">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const key = `pricing.tier.enterprise.f${i}`;
              const text = t(key);
              if (text === key) return null;
              return <li key={i}>{text}</li>;
            })}
          </ul>
          <Link href={`/${l}/contact?topic=enterprise`} className="btn pricing-tier-cta">
            {t("pricing.tier.enterprise.cta")}
          </Link>
        </article>
      </section>

      <section className="pricing-shared">
        <h2>{t("pricing.shared.title")}</h2>
        <ul>
          {[1, 2, 3, 4, 5, 6].map((i) => {
            const key = `pricing.shared.f${i}`;
            const text = t(key);
            if (text === key) return null;
            return <li key={i}>{text}</li>;
          })}
        </ul>
      </section>

      <FaqSection title={t("pricing.faq.title")} items={faq} />
    </>
  );
}
