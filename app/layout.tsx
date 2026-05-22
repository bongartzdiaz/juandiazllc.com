import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { GlobalEffects } from "@/components/GlobalEffects";
import { BackToTop } from "@/components/BackToTop";
import { Analytics } from "@/components/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/dict";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// SEO-focused metadata. Short, keyword-dense title template; descriptive
// default; strong OG/Twitter cards so social shares look right. Keywords
// array is a hint (search engines largely ignore it now) but kept for
// social/AI-crawler consumption.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juan Diaz, LLC — Revenue Engines for Operators",
    template: "%s · Juan Diaz, LLC",
  },
  description:
    "Juan Diaz, LLC builds the systems that make operators more money. Revenue engines, CRM, automations and growth infrastructure for energy, real estate, hospitality and adjacent industries.",
  keywords: [
    "juan diaz",
    "juandiazllc",
    "revenue engine",
    "operator crm",
    "energy crm",
    "real estate crm",
    "growth infrastructure",
    "automation",
    "construction operator",
    "b2b systems",
  ],
  authors: [{ name: "Juan Stefan Bongartz Diaz", url: SITE_URL }],
  creator: "Juan Diaz, LLC",
  publisher: "Juan Diaz, LLC",
  applicationName: "Juan Diaz, LLC",
  category: "business",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Juan Diaz, LLC",
    title: "Juan Diaz, LLC — Revenue Engines for Operators",
    description:
      "I build the systems that make operators more money. Construction-trained. Operator-built.",
    locale: "en_US",
    alternateLocale: ["nl_NL", "de_DE", "es_ES"],
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Juan Diaz, LLC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@juandiazllc",
    creator: "@juanstefandz",
    title: "Juan Diaz, LLC — Revenue Engines for Operators",
    description:
      "I build the systems that make operators more money. Construction-trained. Operator-built.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
  manifest: "/manifest.json",
};

// Lock the viewport to device-width + allow user scaling up to 5x
// (accessibility). theme-color matches the deep-forest palette so iOS
// Safari's status bar tints with the brand.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#020D0A" },
    { media: "(prefers-color-scheme: light)", color: "#020D0A" },
  ],
  colorScheme: "dark",
};

// JSON-LD Organization schema — gives Google rich-result eligibility
// (knowledge panel, sitelinks search). Keep it minimal and factual.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Juan Diaz, LLC",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Holding company building revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
  founder: {
    "@type": "Person",
    name: "Juan Stefan Bongartz Diaz",
    alternateName: "Juan Diaz",
  },
  // Areas served — Google uses this for local / regional ranking signals.
  areaServed: [
    { "@type": "Country", name: "Netherlands" },
    { "@type": "Country", name: "Germany" },
    { "@type": "Country", name: "Spain" },
    { "@type": "Country", name: "United States" },
  ],
  knowsLanguage: ["en", "nl", "de", "es"],
  sameAs: [
    "https://github.com/bongartzdiaz",
    "https://linkedin.com/in/juanstefan",
    "https://linkedin.com/company/juandiazllc",
    "https://twitter.com/juandiazllc",
    "https://instagram.com/diazelcazador",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Juan Diaz, LLC",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const cookieLocale = c.get("jdl_locale")?.value;
  const lang = cookieLocale && (LOCALES as readonly string[]).includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* Feed autodiscovery — RSS for readers, JSON Feed for modern clients */}
        <link rel="alternate" type="application/rss+xml" title="Juan Diaz, LLC — Insights" href="/rss.xml" />
        <link rel="alternate" type="application/feed+json" title="Juan Diaz, LLC — Insights" href="/feed.json" />
        {/* Credits file per humanstxt.org — a weak signal but a
            cheap one, and it gives curious readers a way in. */}
        <link rel="author" href="/humans.txt" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Single-family load reduces network + keeps typography consistent.
            Instrument Serif dropped — Inter italic now serves editorial emphasis. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300..700;1,300..500&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <LocaleProvider>
          <a href="#main" className="skip">Skip to content</a>
          <Overlays />
          <Preloader />
          {children}
          <GlobalEffects />
          <BackToTop />
          <Analytics />
          <VercelAnalytics />
          <WebVitalsReporter />
        </LocaleProvider>
      </body>
    </html>
  );
}
