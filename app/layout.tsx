import type { Metadata } from "next";
import "./globals.css";
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FloatCta } from "@/components/FloatCta";
import { Hud } from "@/components/Hud";
import { GlobalEffects } from "@/components/GlobalEffects";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ScrollProgress } from "@/components/ScrollProgress";
import { CommandPalette } from "@/components/CommandPalette";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juan Diaz LLC — I build the systems that make operators more money.",
    template: "%s · Juan Diaz LLC",
  },
  description:
    "Juan Diaz LLC is the holding I use to ship revenue engines for operators in energy, real estate, hospitality and adjacent industries. Construction-trained. Operator-built.",
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
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      nl: "/",
      de: "/",
      es: "/",
    },
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* JSON-LD structured data — Organization + Website */}
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
                address: {
                  "@type": "PostalAddress",
                  addressCountry: "US",
                  addressRegion: "Delaware",
                },
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
        <LocaleProvider>
          <a href="#main" className="skip">Skip to content</a>
          <ScrollProgress />
          <Overlays />
          <Preloader />
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <FloatCta />
          <Hud />
          <CommandPalette />
          <GlobalEffects />
        </LocaleProvider>
      </body>
    </html>
  );
}
