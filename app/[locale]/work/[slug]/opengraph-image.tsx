import { ImageResponse } from "next/og";
import { getVenture } from "@/lib/ventures";
import { assertLocale } from "@/lib/i18n/metadata";

// Per-venture OG image. Renders the venture name, sector badge, and
// tagline over the brand gradient so shares to LinkedIn / Twitter /
// Slack present a consistent visual card per venture.

export const alt = "Juan Diaz, LLC — Venture";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { locale: string; slug: string } }) {
  const v = getVenture(params.slug, assertLocale(params.locale));
  const name = v?.name ?? "Juan Diaz, LLC";
  const tagline = v?.tagline ?? "Revenue engines for operators.";
  const sector = v?.sector ?? "Holding";
  const status = v?.status ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(900px 700px at 85% 15%, rgba(46,196,137,0.22), transparent 60%), linear-gradient(180deg, #020D0A 0%, #04150F 100%)",
          color: "#E8F4EC",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9ABAA9" }}>
            Juan Diaz, LLC · Ventures
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                display: "flex",
                fontSize: 17,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#2EC489",
                border: "1px solid rgba(46,196,137,0.35)",
                padding: "9px 16px",
                borderRadius: 999,
                background: "rgba(46,196,137,0.08)",
              }}
            >
              {sector}
            </div>
            {status && (
              <div
                style={{
                  display: "flex",
                  fontSize: 17,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#9ABAA9",
                  border: "1px solid #103528",
                  padding: "9px 16px",
                  borderRadius: 999,
                }}
              >
                {status}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 120,
              fontWeight: 300,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: "#E8F4EC",
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 300,
              fontStyle: "italic",
              color: "#2EC489",
              letterSpacing: "-0.01em",
            }}
          >
            {tagline}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7FA393" }}>
            {v?.domain ?? "juandiazllc.com"}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#9ABAA9" }}>juandiazllc.com</div>
        </div>
      </div>
    ),
    size
  );
}
