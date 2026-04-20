import { ImageResponse } from "next/og";
import { getInsight } from "@/lib/insights";

// Per-post OG image generated at build time by Next's @vercel/og.
// Matches the new darker-green palette (bg #020D0A, accent #2EC489)
// so the card looks cohesive with the rest of the brand on Twitter,
// LinkedIn, Slack unfurls, etc. Falls back to the site default if
// the slug is unknown (shouldn't happen because generateStaticParams
// restricts to known posts, but defensive).

export const alt = "Juan Diaz, LLC — Insight";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { slug: string } }) {
  const post = getInsight(params.slug);
  const title = post?.title ?? "Juan Diaz, LLC — Insight";
  const tag = post?.tag ?? "Insights";
  const readingMinutes = post?.readingMinutes;

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
            "radial-gradient(900px 700px at 15% 10%, rgba(46,196,137,0.22), transparent 60%), linear-gradient(180deg, #020D0A 0%, #04150F 100%)",
          color: "#E8F4EC",
          fontFamily: "Inter",
        }}
      >
        {/* top row — mark + tag */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <svg width="56" height="56" viewBox="0 0 96 96" fill="none">
              <line x1="30" y1="8" x2="66" y2="8" stroke="#2EC489" strokeWidth="1.6" opacity="0.55" strokeLinecap="round" />
              <circle cx="48" cy="8" r="3.6" fill="#2EC489" />
              <line x1="48" y1="14" x2="48" y2="50" stroke="#2EC489" strokeWidth="1.8" strokeLinecap="round" />
              <path
                d="M 48 50 Q 30 50 30 64 L 48 86 L 66 64 Q 66 50 48 50 Z M 51 64 a 3 3 0 1 0 -6 0 a 3 3 0 1 0 6 0 Z"
                fill="#2EC489"
                fillRule="evenodd"
              />
            </svg>
            <div style={{ display: "flex", fontSize: 20, letterSpacing: "0.2em", textTransform: "uppercase", color: "#9ABAA9" }}>
              Juan Diaz, LLC
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#2EC489",
              border: "1px solid rgba(46,196,137,0.35)",
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(46,196,137,0.08)",
            }}
          >
            — {tag}
          </div>
        </div>

        {/* title — large, editorial */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 60 ? 58 : 72,
            fontWeight: 300,
            lineHeight: 1.04,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
            color: "#E8F4EC",
          }}
        >
          {title}
        </div>

        {/* bottom row — reading time + url */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 18, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7FA393" }}>
              Insights
            </div>
            {readingMinutes && (
              <div style={{ display: "flex", fontSize: 22, color: "#9ABAA9" }}>
                {readingMinutes} min read
              </div>
            )}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#9ABAA9" }}>juandiazllc.com</div>
        </div>
      </div>
    ),
    size
  );
}
