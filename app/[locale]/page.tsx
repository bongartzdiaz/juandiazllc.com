import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Story } from "@/components/sections/Story";
import { Sectors } from "@/components/sections/Sectors";
import { Process } from "@/components/sections/Process";
import { Kinetic } from "@/components/sections/Kinetic";
import { Chapters } from "@/components/sections/Chapters";
import { Ventures } from "@/components/sections/Ventures";
import { Stats } from "@/components/sections/Stats";
import { ResultsStrip } from "@/components/sections/ResultsStrip";
import { Signals } from "@/components/sections/Signals";
import { CtaBig } from "@/components/sections/CtaBig";
import { Contact } from "@/components/sections/Contact";
import { FaqSection } from "@/components/FaqSection";
import { LiveSignals } from "@/components/LiveSignals";
import { Countdown2027 } from "@/components/Countdown2027";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";
import { faqSchema } from "@/lib/seo/schema";
import { getHomeFaq } from "@/lib/seo/faqs";
import { OG_IMAGES } from "@/lib/seo/branding";

// Titles lead with the commercial search term ("fractional revenue
// operator" / localized) then the brand — the home page is the primary
// ranking target for the personal-operator positioning. Kept <60 chars
// so Google doesn't truncate. Descriptions carry the long-tail + the
// three target sectors (energy / real estate / hospitality) + the
// credibility hook, in the priority markets (EN/DE/ES).

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    // absolute: de homepage is de merkpagina. Zonder dit plakt de
    // layout-template er nog een " · Juan Diaz" achter en staat de naam
    // er twee keer in — 64 tekens, gemeten 2026-08-02.
    title: { absolute: translate(l, "meta.home.title") },
    description: translate(l, "meta.home.description"),
    alternates: buildAlternates(l, "/"),
    openGraph: {
      images: OG_IMAGES,
      type: "website",
      title: translate(l, "meta.home.title"),
      description: translate(l, "meta.home.description"),
      url: `/${l}`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  // #5 — make the core consultancy offering explicit for service search intent
  // + LLMs (the page otherwise only carried FAQ schema). Sector-framed Service
  // schema already lives on /sectors/[slug]; this is the service-framed parent.
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Juan Diaz, LLC — Fractional Revenue Operations",
    url: `${SITE}/${l}`,
    description: translate(l, "meta.home.description"),
    serviceType: "Fractional revenue operations, operator software, build-vs-buy advisory",
    areaServed: ["United States", "European Union", "Netherlands", "Germany", "Spain"],
    availableLanguage: ["English", "Dutch", "German", "Spanish"],
    provider: { "@type": "Organization", name: "Juan Diaz, LLC", url: SITE },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(getHomeFaq(l))) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <Hero />
      <Marquee />
      <Story />
      <Sectors />
      <Process />
      <Kinetic />
      <Chapters />
      <Ventures />
      <LiveSignals locale={l} />
      <section style={{ padding: "40px 40px 0", maxWidth: "var(--max)", margin: "0 auto" }}>
        <Countdown2027 />
      </section>
      <Stats />
      <ResultsStrip />
      <Signals />
      <CtaBig />
      <FaqSection title={translate(l, "faq.home.title")} items={getHomeFaq(l)} />
      <Contact />
    </>
  );
}
