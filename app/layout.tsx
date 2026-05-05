import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { GlobalEffects } from "@/components/GlobalEffects";
import { BackToTop } from "@/components/BackToTop";
import { Analytics } from "@/components/Analytics";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { SentryBootstrap } from "@/components/SentryBootstrap";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/dict";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// Self-hosted fonts via next/font. Inlines @font-face at build time,
// serves WOFF2 from the same origin, drops the render-blocking
// external CSS round-trip to fonts.googleapis.com (and the matching
// preconnect pair). Variable font axis matches what we had before:
// Inter 300..700 with italic, JetBrains Mono 300/400/500. Exposed as
// CSS variables so globals.css can keep its existing
// `font-family: 'Inter'` / `font-family: 'JetBrains Mono'` rules
// through the --font-inter / --font-mono indirection.
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-inter",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-mono",
  preload: false,
});

// Preconnect hint target for Plausible. Reading the same env vars the
// Analytics component reads keeps behaviour in lockstep — if analytics
// is disabled (no domain set) we don't emit a wasted preconnect.
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_HOST = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? "https://plausible.io";

// Google Search Console domain verification. Hard-coded default is the
// active token for juandiazllc.com — set GOOGLE_SITE_VERIFICATION in the
// Vercel dashboard to override without a code change (e.g. after rotating
// or verifying an additional property).
const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION ?? "ABrD7ZNd5VJaxKfLcj9Lp5mznR-tqmKMfPTPoYQ6tKs";

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
    "juan stefan bongartz diaz",
    "juan stefan bongartz",
    "juandiazllc",
    "juan diaz llc",
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
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
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
  "@id": `${SITE_URL}/#organization`,
  name: "Juan Diaz, LLC",
  alternateName: ["JuanDiazLLC", "juandiazllc"],
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Holding company building revenue engines for operators in energy, real estate, hospitality and adjacent industries. Founded and run by Juan Stefan Bongartz Diaz.",
  foundingDate: "2024",
  founder: {
    "@type": "Person",
    "@id": `${SITE_URL}/about#person`,
    name: "Juan Stefan Bongartz Diaz",
    alternateName: ["Juan Diaz", "Juan S. Diaz"],
    jobTitle: "Founder",
    url: `${SITE_URL}/about`,
    image: `${SITE_URL}/me/portrait.svg`,
    nationality: { "@type": "Country", name: "Netherlands" },
    workLocation: {
      "@type": "Place",
      name: "Amsterdam, Netherlands",
    },
    sameAs: [
      "https://github.com/bongartzdiaz",
      "https://linkedin.com/in/juanstefan",
      "https://twitter.com/juandiazllc",
      "https://instagram.com/diazelcazador",
    ],
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
    <html lang={lang} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {PLAUSIBLE_DOMAIN ? (
          <link rel="preconnect" href={PLAUSIBLE_HOST} crossOrigin="" />
        ) : null}
        {/* Bundle CS — preload the homepage globe's TopoJSON so its
            fetch starts in parallel with the JS bundle parse instead
            of waiting for hydration. ~108 KB; saves a render-blocking
            round-trip on Hero LCP. */}
        <link rel="preload" as="fetch" href="/world-110m.json" crossOrigin="anonymous" type="application/json" />
        {/* Feed autodiscovery — RSS for readers, JSON Feed for modern clients */}
        <link rel="alternate" type="application/rss+xml" title="Juan Diaz, LLC — Insights" href="/rss.xml" />
        <link rel="alternate" type="application/feed+json" title="Juan Diaz, LLC — Insights" href="/feed.json" />
        {/* Credits file per humanstxt.org — a weak signal but a
            cheap one, and it gives curious readers a way in. */}
        <link rel="author" href="/humans.txt" />
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
          <WebVitalsReporter />
          <SentryBootstrap />
        </LocaleProvider>
      </body>
    </html>
  );
}
