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
import { faqSchema } from "@/lib/seo/schema";
import { HOME_FAQ } from "@/lib/seo/faqs";

// Titles lead with the commercial search term ("fractional revenue
// operator" / localized) then the brand — the home page is the primary
// ranking target for the personal-operator positioning. Kept <60 chars
// so Google doesn't truncate. Descriptions carry the long-tail + the
// three target sectors (energy / real estate / hospitality) + the
// credibility hook, in the priority markets (EN/DE/ES).
const TITLES: Record<string, string> = {
  en: "Juan Diaz — Fractional Revenue Operator & Consultant",
  nl: "Juan Diaz — Revenue Operator & Operations-consultant",
  de: "Juan Diaz — Fractional Revenue Operator & Berater",
  es: "Juan Diaz — Operador de Revenue Fraccional y Consultor",
};

const DESCRIPTIONS: Record<string, string> = {
  en: "Juan Diaz is a fractional revenue operator and operations consultant for energy, real estate and hospitality operators. Construction-trained, operator-built.",
  nl: "Juan Diaz — fractional revenue operator en operations-consultant voor operators in energie, vastgoed en horeca. Bouwkundig getraind, operator-built.",
  de: "Juan Diaz ist Fractional Revenue Operator und Operations-Berater für Betreiber in Energie, Immobilien und Gastgewerbe. Bauerprobt, operator-built.",
  es: "Juan Diaz, operador de revenue fraccional y consultor de operaciones para energía, inmobiliario y hostelería. Formado en construcción, hecho por operadores.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: TITLES[l],
    description: DESCRIPTIONS[l],
    alternates: buildAlternates(l, "/"),
    openGraph: {
      type: "website",
      title: TITLES[l],
      description: DESCRIPTIONS[l],
      url: `/${l}`,
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
  };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(HOME_FAQ)) }}
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
      <FaqSection title="Operator questions, answered" items={HOME_FAQ} />
      <Contact />
    </>
  );
}
