import { ImageResponse } from "next/og";
import { LOCALES, translate } from "@/lib/i18n/dict";
import { assertLocale } from "@/lib/i18n/metadata";

// Per-locale OG image. Overrides the English default in app/opengraph-image.tsx
// for every route under /[locale]/* unless a deeper segment (work/[slug],
// insights/[slug], signals/[slug]) provides its own. That means social
// shares of /nl, /de, /es, /nl/about, /de/sectors etc. now get a card
// rendered in the visitor's language instead of leaking English copy.

export const alt = "Juan Diaz, LLC — I build the systems that make operators more money.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pre-render one image per supported locale at build time so social
// scrapers (Twitter, LinkedIn, Slack, WhatsApp) get a cached response
// the first time they hit any /{locale}/* share URL.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(800px 600px at 30% 20%, rgba(46,196,137,0.22), transparent 60%), linear-gradient(180deg, #020D0A 0%, #04150F 100%)",
          color: "#E8F4EC",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="64" height="64" viewBox="0 0 96 96" fill="none">
            <line x1="30" y1="8" x2="66" y2="8" stroke="#2EC489" strokeWidth="1.6" opacity="0.55" strokeLinecap="round" />
            <circle cx="48" cy="8" r="3.6" fill="#2EC489" />
            <line x1="48" y1="14" x2="48" y2="50" stroke="#2EC489" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 48 50 Q 30 50 30 64 L 48 86 L 66 64 Q 66 50 48 50 Z M 51 64 a 3 3 0 1 0 -6 0 a 3 3 0 1 0 6 0 Z" fill="#2EC489" fillRule="evenodd" />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#9ABAA9",
            }}
          >
            Juan Diaz, LLC
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 96,
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            maxWidth: 1000,
          }}
        >
          <div style={{ display: "flex" }}>{t("og.headline.1")}</div>
          <div style={{ display: "flex" }}>{t("og.headline.2")}</div>
          <div style={{ display: "flex", color: "#5EFFB1", fontStyle: "italic" }}>
            {t("og.headline.3")}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#8BA89A",
            paddingTop: 24,
            borderTop: "1px solid #163A2B",
          }}
        >
          <div style={{ display: "flex" }}>{t("og.sectors")}</div>
          <div style={{ display: "flex", color: "#5EFFB1" }}>juandiazllc.com</div>
        </div>
      </div>
    ),
    size
  );
}
