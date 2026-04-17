import type { Metadata } from "next";
import "./globals.css";
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { FloatCta } from "@/components/FloatCta";
import { Hud } from "@/components/Hud";
import { GlobalEffects } from "@/components/GlobalEffects";

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
    icon: "/favicon.svg",
  },
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
        <a href="#main" className="skip">Skip to content</a>
        <Overlays />
        <Preloader />
        <Nav />
        <main id="main">{children}</main>
        <Footer />
        <FloatCta />
        <Hud />
        <GlobalEffects />
      </body>
    </html>
  );
}
