import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FloatCta } from "@/components/FloatCta";
import { Hud } from "@/components/Hud";
import { CommandPalette } from "@/components/CommandPalette";
import { ScrollProgress } from "@/components/ScrollProgress";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export const metadata: Metadata = {
  openGraph: {
    type: "website",
    title: "Juan Diaz LLC",
    description:
      "Revenue engines for operators in energy, real estate, hospitality and adjacent industries. Construction-trained. Operator-built.",
    siteName: "Juan Diaz LLC",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Juan Diaz LLC",
    description:
      "Revenue engines for operators in energy, real estate, hospitality and adjacent.",
  },
  alternates: {
    canonical: "/",
    languages: { en: "/", nl: "/", de: "/", es: "/" },
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

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
              founder: {
                "@type": "Person",
                name: "Juan Stefan Diaz",
                jobTitle: "Founder",
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
