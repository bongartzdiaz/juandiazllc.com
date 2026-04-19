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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l: Locale = (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : "en";
  return {
    openGraph: {
      siteName: "Juan Diaz LLC",
      locale: ogLocale(l),
      alternateLocale: alternateOgLocales(l),
    },
    twitter: {
      card: "summary_large_image",
      title: "Juan Diaz LLC",
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
      "Juan Stefan Diaz",
      "Juan Diaz LLC",
    ],
    authors: [{ name: "Juan Stefan Diaz", url: SITE_URL }],
    creator: "Juan Stefan Diaz",
    publisher: "Juan Diaz LLC",
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
              name: "Juan Diaz LLC",
              alternateName: "JDL",
              url: SITE_URL,
              logo: `${SITE_URL}/icon.svg`,
              image: `${SITE_URL}/me/portrait.jpg`,
              founder: {
                "@type": "Person",
                name: "Juan Stefan Diaz",
                jobTitle: "Founder",
                image: `${SITE_URL}/me/portrait.jpg`,
                url: `${SITE_URL}/${l}/about`,
                sameAs: [
                  "https://linkedin.com/in/juanstefan",
                  "https://instagram.com/diazelcazador",
                ],
              },
              foundingDate: "2026",
              description:
                "Holding company shipping revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
              sameAs: [
                "https://linkedin.com/in/juanstefan",
                "https://instagram.com/diazelcazador",
              ],
              address: { "@type": "PostalAddress", addressCountry: "US", addressRegion: "Delaware" },
              contactPoint: {
                "@type": "ContactPoint",
                email: "juan@juandiazllc.com",
                contactType: "Sales",
                availableLanguage: ["English", "Dutch", "German", "Spanish"],
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Juan Diaz LLC",
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
