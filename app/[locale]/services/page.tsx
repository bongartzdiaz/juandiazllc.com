import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { breadcrumbSchema } from "@/lib/breadcrumb";
import { faqSchema } from "@/lib/seo/schema";
import { getServicesFaq } from "@/lib/seo/faqs";
import { FaqSection } from "@/components/FaqSection";
import { ResultsStrip } from "@/components/sections/ResultsStrip";
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
        {/* De FAQ zei al "begin bij het symptoom, niet bij de dienst", terwijl
            de kaarten erboven precies andersom waren opgebouwd. Het symptoom
            staat nu vóór de dienstnaam, in de woorden van de bezoeker. */}
        <p style={{ marginBottom: 24, color: "var(--muted)" }}>{t("services.symptom.lead")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {DELIVERABLES.map((d) => (
            <LocaleLink key={d.id} href={d.href} className="sec-card" data-reveal style={{ minHeight: 240 }}>
              <div>
                <div style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(17px, 2vw, 21px)", letterSpacing: "-.01em", marginBottom: 10 }}>
                  “{t(`services.${d.id}.symptom`)}”
                </div>
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
      {/* De koopvraag stond alleen in de FAQ onder de knop, dichtgeklapt:
          gratis blueprint-gesprek, diagnose van één pagina, sprint tegen
          vaste prijs, scope pas daarna. Wie dat leest boekt; wie het niet
          ziet, boekt niet. Staat nu vóór de CTA. Geen bedrag — die komt uit
          docs/claims.md en er staat er geen voor dit traject. */}
      <section style={{ padding: "0 40px 72px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-.02em", marginBottom: 28 }}>
          {t("services.how.title")}
        </h2>
        <ol style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, listStyle: "none", padding: 0, margin: 0, counterReset: "how" }}>
          {["s1", "s2", "s3"].map((s, i) => (
            <li key={s} style={{ padding: 24, border: "1px solid var(--line)", borderRadius: 18, background: "var(--panel)" }} data-reveal>
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".12em", color: "var(--muted-soft)" }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="ix" style={{ marginTop: 10 }}>{t(`services.how.${s}.title`)}</div>
              <p style={{ marginTop: 12 }}>{t(`services.how.${s}.body`)}</p>
              {/* Blueprint staat twee keer op deze site: als fase 02 van de
                  methode en als naam van dit gratis gesprek. Dat is geen
                  slordigheid maar dezelfde stap op twee schalen, en dat mag de
                  lezer niet zelf hoeven afleiden. Hernoemen zou het duurder én
                  slechter maken — "blueprint call" staat 7 keer in de Engelse
                  FAQ alleen, en de vijf fasen dragen de bouwkundige metafoor
                  waar de positionering op rust. Zie docs/aanbod.md §3.5. */}
              {s === "s1" && (
                <p style={{ marginTop: 10, color: "var(--muted-soft)", fontSize: 14 }}>
                  {t("services.how.s1.note")}
                </p>
              )}
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 24, color: "var(--muted)" }}>{t("services.how.note")}</p>
      </section>
      {/* Het bewijs stond alleen op de homepage. Deze pagina beschreef vier
          diensten en een ladder van vier stappen, en droeg tot 2026-08-20 geen
          enkel cijfer — terwijl docs/claims.md vier bevestigde klantuitkomsten
          bijhoudt die al in vier talen gepubliceerd zijn. Staat hier tussen de
          ladder en de CTA: eerst wat het kost aan stappen, dan wat het elders
          opleverde, dan de vraag. Zie docs/aanbod.md §2. */}
      <ResultsStrip />
      <section style={{ padding: "0 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ padding: 32, border: "1px solid var(--line)", borderRadius: 18, background: "linear-gradient(180deg, var(--panel), var(--bg-2))" }}>
          <div style={{ fontFamily: "'Inter'", fontWeight: 300, fontSize: "clamp(22px, 3vw, 32px)", letterSpacing: "-.02em", marginBottom: 24 }}>
            {t("services.cta.title")}
          </div>
          {/* Herkomst mee. /pricing doet dit sinds #196 en /tools/energy-roi
              ook; deze pagina stuurde alles naar een kaal /contact, dus een
              lead van hier was niet te onderscheiden van een lead vanaf de
              homepage. ContactForm leest de parameter uit en schrijft hem weg
              in `source` als contact_page:interest=services:stage=…
              Per dienst zou beter zijn, maar de vier kaarten zijn zelf al
              links naar /work, /sectors en twee artikelen — een tweede anchor
              erin is ongeldige HTML. Dit is de pagina-brede variant. */}
          <LocaleLink className="btn primary btn-mag" href="/contact?interest=services">
            {t("cta.book")} <span className="arr">→</span>
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
