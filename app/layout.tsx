import type { Metadata } from "next";
import "./globals.css";
import { Overlays } from "@/components/Overlays";
import { Preloader } from "@/components/Preloader";
import { GlobalEffects } from "@/components/GlobalEffects";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Juan Diaz LLC — I build the systems that make operators more money.",
    template: "%s · Juan Diaz LLC",
  },
  description:
    "Juan Diaz LLC is the holding I use to ship revenue engines for operators in energy, real estate, hospitality and adjacent industries. Construction-trained. Operator-built.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        <LocaleProvider>
          <a href="#main" className="skip">Skip to content</a>
          <Overlays />
          <Preloader />
          <main id="main">{children}</main>
          <GlobalEffects />
        </LocaleProvider>
      </body>
    </html>
  );
}
