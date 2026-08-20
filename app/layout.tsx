import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — zero render-blocking 3rd-party request,
// woff2 served from our own origin, automatic font-display: swap +
// size-adjust fallback metrics (kills CLS). Exposed as CSS variables
// so globals.css references them as var(--font-inter) / var(--font-mono).
// Replaces the old <link rel="stylesheet"> to fonts.googleapis.com.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["300", "400", "500"],
});
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { GlobalEffects } from "@/components/GlobalEffects";
import { BackToTop } from "@/components/BackToTop";
import { Analytics } from "@/components/Analytics";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/dict";
import {
  TITLE_SUFFIX,
  PERSON_NAME,
  PERSON_ALTERNATE_NAMES,
  PERSON_ID,
  PERSON_URL,
  ORG_NAME,
  ORG_ID,
  ORG_SAME_AS,
} from "@/lib/seo/branding";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

// SEO-focused metadata. Short, keyword-dense title template; descriptive
// default; strong OG/Twitter cards so social shares look right. Keywords
// array is a hint (search engines largely ignore it now) but kept for
// social/AI-crawler consumption.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juan Diaz — Fractional Revenue Operator & Consultant",
    template: `%s${TITLE_SUFFIX}`,
  },
  description:
    "Juan Diaz is a fractional revenue operator and operations consultant for energy, real estate and hospitality operators — building the revenue systems that make operators more money. Construction-trained, operator-built.",
  keywords: [
    "juan diaz",
    "juandiazllc",
    "fractional revenue operator",
    "revenue operations consultant",
    "operations consultant",
    "revops consultant",
    "fractional operator",
    "revenue operations partner",
    "operations consultant energy",
    "operations consultant real estate",
    "operations consultant hospitality",
    "operator-led growth",
    "revenue systems consultant",
    "construction-trained operator",
  ],
  authors: [{ name: PERSON_NAME, url: SITE_URL }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  applicationName: ORG_NAME,
  category: "business",
  alternates: {
    canonical: "/",
  },
  // Search Console kan op twee manieren eigendom vaststellen. De aanbevolen
  // route is een Domain-property met een DNS-TXT-record bij de registrar —
  // die raakt de code niet en dekt ook subdomeinen.
  //
  // Dit is de terugvaloptie: bij een URL-prefix-property geeft Google een
  // meta-tag. Zet GOOGLE_SITE_VERIFICATION in Vercel en de tag verschijnt op
  // elke pagina; laat hem leeg en er wordt niets gerenderd. Zo hoeft er geen
  // code te wijzigen op het moment dat de token er is.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
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
    title: "Juan Diaz — Fractional Revenue Operator & Consultant",
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
    title: "Juan Diaz — Fractional Revenue Operator & Consultant",
    description:
      "I build the systems that make operators more money. Construction-trained. Operator-built.",
    images: ["/opengraph-image"],
  },
  icons: {
    // NB: /favicon.svg is deliberately absent — app/favicon.svg is not a
    // Next filename convention (only favicon.ico auto-serves), so listing
    // it here 404'd on every page. /icon.svg is the convention route.
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
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
  "@id": ORG_ID,
  name: ORG_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Holding company building revenue engines for operators in energy, real estate, hospitality and adjacent industries.",
  // Vierde knoop die dezelfde persoon beschrijft. Draagt daarom dezelfde
  // `@id` als /about, de taal-layout en lib/seo/article.ts.
  founder: {
    "@type": "Person",
    "@id": PERSON_ID,
    name: PERSON_NAME,
    alternateName: PERSON_ALTERNATE_NAMES,
    url: PERSON_URL,
  },
  // Areas served — Google uses this for local / regional ranking signals.
  areaServed: [
    { "@type": "Country", name: "Netherlands" },
    { "@type": "Country", name: "Germany" },
    { "@type": "Country", name: "Spain" },
    { "@type": "Country", name: "United States" },
  ],
  knowsLanguage: ["en", "nl", "de", "es"],
  sameAs: ORG_SAME_AS,
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: ORG_NAME,
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
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
        {/* Feed autodiscovery — RSS for readers, JSON Feed for modern clients */}
        <link rel="alternate" type="application/rss+xml" title="Juan Diaz, LLC — Insights" href="/rss.xml" />
        <link rel="alternate" type="application/feed+json" title="Juan Diaz, LLC — Insights" href="/feed.json" />
        {/* Credits file per humanstxt.org — a weak signal but a
            cheap one, and it gives curious readers a way in. */}
        <link rel="author" href="/humans.txt" />
        {/* Fonts are self-hosted via next/font/google (see top of file) —
            no fonts.googleapis.com round-trip, no render-blocking. */}
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
        </LocaleProvider>
      </body>
    </html>
  );
}
