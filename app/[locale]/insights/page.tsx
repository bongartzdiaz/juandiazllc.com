import type { Metadata } from "next";
import { getAllInsights } from "@/lib/insights";
import { InsightsList } from "@/components/InsightsList";
import { NewsletterForm } from "@/components/NewsletterForm";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { collectionPageSchema } from "@/lib/seo/schema";

// /insights — long-form writing. Primary SEO surface after the home
// page: each post is a standalone URL with its own Article schema,
// and the list page is keyword-dense around the brand topics
// (operator CRM, revenue systems, energy funnels).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Insights — operator systems, energy funnels, revenue engines",
    description:
      "Field notes on building the systems that move real P&Ls. Operator CRMs, energy funnels, build-vs-buy — written for the people who own the number.",
    alternates: buildAlternates(l, "/insights"),
    openGraph: {
      title: "Insights — Juan Diaz, LLC",
      description: "Field notes on building the systems that move real P&Ls.",
      type: "website",
      url: `/${l}/insights`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function InsightsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  const posts = getAllInsights();

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Insights", path: `/${l}/insights` },
  ]);

  const collection = collectionPageSchema({
    locale: l,
    path: "/insights",
    name: "Insights — Juan Diaz, LLC",
    description: "Field notes on building the systems that move real P&Ls.",
    items: posts.map((p) => ({
      name: p.title,
      url: `/${l}/insights/${p.slug}`,
      description: p.summary,
    })),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("insights.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("insights.page.title") }} />
        <p>{t("insights.page.lede")}</p>
      </header>

      <section
        style={{
          padding: "40px 40px 140px",
          maxWidth: "var(--max)",
          margin: "0 auto",
        }}
      >
        <InsightsList posts={posts} />

        <div style={{ marginTop: 72 }}>
          <NewsletterForm source="insights_index" />
        </div>
      </section>
    </>
  );
}
