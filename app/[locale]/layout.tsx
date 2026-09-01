import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FloatCta } from "@/components/FloatCta";
import { Hud } from "@/components/Hud";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollProgress } from "@/components/ScrollProgress";
import { LOCALES, type Locale } from "@/lib/i18n/dict";
import { ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import {
  AUTHOR_IMAGE_URL,
  ORG_LOGO_URL,
  PERSON_SAME_AS,
  PERSON_NAME,
  PERSON_ALTERNATE_NAMES,
  PERSON_ID,
  PERSON_URL,
  ORG_NAME,
  ORG_ID,
  ORG_SAME_AS,
  ogImages,
  twitterImages,
  CONTACT_EMAIL,
} from "@/lib/seo/branding";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
  return {
    openGraph: {
      images: ogImages(l),
      siteName: "Juan Diaz, LLC",
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
    twitter: {
      card: "summary_large_image",
      images: twitterImages(l),
      title: "Juan Diaz, LLC",
      description:
        "Revenue engines for operators in energy, real estate, hospitality and adjacent.",
    },
    keywords: [
      "operator tools",
      "revenue engineering",
      "energy operations",
      "real estate operations",
      "hospitality revenue",
      "Voltafy",
      "salderingsregeling 2027",
      // Alle drie de naamvormen: de volle vorm is bijna uniek, de middelste
      // stond in de meting van 2026-08-20 al bovenaan, de korte is wat iemand
      // intikt die de naam hoorde.
      PERSON_NAME,
      ...PERSON_ALTERNATE_NAMES,
      ORG_NAME,
    ],
    authors: [{ name: PERSON_NAME, url: SITE_URL }],
    creator: PERSON_NAME,
    publisher: ORG_NAME,
    category: "business operations",
  };
}

export default async function MainLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) notFound();
  const l = locale as Locale;
  return (
    <main id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": ORG_ID,
              name: ORG_NAME,
              alternateName: "JDL",
              url: SITE_URL,
              logo: ORG_LOGO_URL,
              image: AUTHOR_IMAGE_URL,
              // Zelfde `@id`, naam en url als de knopen in /about en in
              // lib/seo/article.ts — anders leest een crawler drie personen.
              founder: {
                "@type": "Person",
                "@id": PERSON_ID,
                name: PERSON_NAME,
                alternateName: PERSON_ALTERNATE_NAMES,
                jobTitle: "Founder",
                image: AUTHOR_IMAGE_URL,
                url: PERSON_URL,
                sameAs: PERSON_SAME_AS,
              },
              foundingDate: "2026",
              description:
                "Holding company shipping revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
              // De organisatie, niet de persoon: een bedrijfspagina hoort bij de
              // rechtspersoon. Stond tot 2026-08-20 op PERSON_SAME_AS, waardoor
              // een persoonlijke Instagram als bedrijfsprofiel werd opgegeven.
              sameAs: ORG_SAME_AS,
              // Delaware = the legal entity; Amsterdam = the operating base.
              // The NL block carries the local-intent signal for NL/DE/ES search.
              address: [
                { "@type": "PostalAddress", addressCountry: "US", addressRegion: "Delaware" },
                { "@type": "PostalAddress", addressCountry: "NL", addressLocality: "Amsterdam" },
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: CONTACT_EMAIL,
                contactType: "Sales",
                availableLanguage: ["English", "Dutch", "German", "Spanish"],
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Juan Diaz, LLC",
              url: SITE_URL,
              inLanguage: ["en", "nl", "de", "es"],
            },
          ]),
        }}
      />
      <ScrollProgress />
      <Nav />
      {children}
      <Footer />
      <FloatCta />
      <Hud />
      <CommandPalette />
    </main>
  );
}
