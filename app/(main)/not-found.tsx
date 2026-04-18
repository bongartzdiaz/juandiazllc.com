import Link from "next/link";
import type { Metadata } from "next";

// 404 page — on-brand, minimal, with clear recovery paths. Returns a
// real 404 status because Next renders this through the not-found()
// plumbing when a route does not resolve.
export const metadata: Metadata = {
  title: "Not found — 404",
  description: "The page you were looking for does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: "120px 24px 80px",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 620 }}>
        <div className="eyebrow" style={{ marginBottom: 24 }}>
          ◉ 404
        </div>
        <h1
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 300,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginBottom: 24,
          }}
        >
          <em>Dead end.</em>
        </h1>
        <p
          style={{
            color: "var(--muted)",
            fontSize: 17,
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          That URL does not resolve to anything on this site. It might have been moved,
          renamed, or never existed in the first place. Here are the roads that do go
          somewhere useful:
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href="/" className="btn primary">
            Home <span className="arr">→</span>
          </Link>
          <Link href="/insights" className="btn ghost">
            Insights <span className="arr">→</span>
          </Link>
          <Link href="/contact" className="btn ghost">
            Contact <span className="arr">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
