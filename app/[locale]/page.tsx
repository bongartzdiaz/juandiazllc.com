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

const TITLES: Record<string, string> = {
  en: "Juan Diaz, LLC — revenue engines for operators",
  nl: "Juan Diaz, LLC — omzetmotoren voor operators",
  de: "Juan Diaz, LLC — Umsatzmotoren für Operators",
  es: "Juan Diaz, LLC — motores de ingresos para operadores",
};

const DESCRIPTIONS: Record<string, string> = {
  en: "Revenue engines for operators in energy, real estate, hospitality and adjacent industries. Construction-trained. Operator-built.",
  nl: "Omzetmotoren voor operators in energie, vastgoed, horeca en aanverwante sectoren. Getraind in bouwmanagement. Gebouwd voor operators.",
  de: "Umsatzmotoren für Operators in Energie, Immobilien, Gastgewerbe und angrenzenden Branchen. Bauleitungs-trainiert. Operator-gebaut.",
  es: "Motores de ingresos para operadores en energía, bienes raíces, hostelería e industrias adyacentes. Formado en gestión de construcción. Construido para operadores.",
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
