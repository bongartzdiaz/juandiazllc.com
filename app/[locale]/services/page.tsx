import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { faqSchema } from "@/lib/seo/schema";
import { getServicesFaq } from "@/lib/seo/faqs";
import { FaqSection } from "@/components/FaqSection";
import { OG_IMAGES } from "@/lib/seo/branding";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Deliverable-framed (what I deliver), distinct from /sectors (industry-framed)
// and the home (brand-framed) — so it captures service-intent without
// cannibalizing either. Each card links into an existing funnel page.
const DELIVERABLES = [
  { id: "engine", href: "/work" },
  { id: "fractional", href: "/sectors" },
  { id: "advisory", href: "/insights/the-build-vs-buy-trap" },
  { id: "instruments", href: "/signals/instruments-not-saas" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.services.title"),
    description: translate(l, "meta.services.description"),
    alternates: buildAlternates(l, "/services"),
    openGraph: {
      images: OG_IMAGES,
      type: "website",
      url: `/${l}/services`,
      title: translate(l, "meta.services.title"),
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  const crumbs = breadcrumbSchema([
    { name: "Home", path: `/${l}` },
    { name: "Services", path: `/${l}/services` },
  ]);

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Juan Diaz, LLC — Fractional Revenue Operations",
    url: `${SITE}/${l}/services`,
    serviceType: "Fractional revenue operations, operator software, build-vs-buy advisory",
    areaServed: ["United States", "European Union", "Netherlands", "Germany", "Spain"],
    availableLanguage: ["English", "Dutch", "German", "Spanish"],
    provider: { "@type": "Organization", name: "Juan Diaz, LLC", url: SITE },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Operator services",
      itemListElement: DELIVERABLES.map((d) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: t(`services.${d.id}.title`) },
        url: `${SITE}/${l}${d.href}`,
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <header className="page-hero">
        <div className="eyebrow">{t("services.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("services.page.title") }} />
        <p>{t("services.page.lede")}</p>
      </header>
      <section style={{ padding: "80px 40px 80px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {DELIVERABLES.map((d) => (
            <LocaleLink key={d.id} href={d.href} className="sec-card" data-reveal style={{ minHeight: 240 }}>
              <div>
                <div className="ix">— {t(`services.${d.id}.title`)}</div>
                <p style={{ marginTop: 16 }}>{t(`services.${d.id}.body`)}</p>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--muted-soft)", textTransform: "uppercase", marginTop: 20 }}>
                {t("services.more")} <span className="arr">→</span>
              </div>
            </LocaleLink>
          ))}
        </div>
      </section>
      <section style={{ padding: "0 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ padding: 32, border: "1px solid var(--line)", borderRadius: 18, background: "linear-gradient(180deg, var(--panel), var(--bg-2))" }}>
          <div style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-.02em", marginBottom: 24 }}>
            {t("services.cta.title")}
          </div>
          <LocaleLink className="btn primary btn-mag" href="/contact">
            {t("services.cta.btn")} <span className="arr">→</span>
          </LocaleLink>
        </div>
      </section>
      {/* De pagina beschreef vier diensten maar beantwoordde geen koopvraag.
          Staat ná de CTA: wie al overtuigd is klikt door, wie nog twijfelt
          leest verder. Het schema geeft dezelfde antwoorden aan AI-overzichten. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(getServicesFaq(l))) }}
      />
      <FaqSection title={t("faq.services.title")} items={getServicesFaq(l)} />
    </>
  );
}
