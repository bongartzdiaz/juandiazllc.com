import type { Metadata } from "next";
import Link from "next/link";
import { SIGNALS } from "@/lib/signals";

export const metadata: Metadata = {
  title: "Signals — field notes and build logs",
  description:
    "Short essays on designing operator tools, shipping dashboards that survive real environments, and running small studios at speed.",
};

export default function SignalsIndex() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Signals</div>
        <h1>Field notes, build <em>logs.</em></h1>
        <p>
          Writing is a lagging indicator of real work. These are the operating notes I&apos;d want a
          new partner, hire, or client to read before we start. New pieces arrive when they&apos;re ready
          — not before.
        </p>
      </header>
      <section style={{ padding: "80px 40px 160px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {SIGNALS.map((s) => (
            <Link
              key={s.slug}
              href={`/signals/${s.slug}`}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr auto",
                gap: 32,
                padding: "32px 28px",
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "var(--panel)",
                alignItems: "baseline",
                transition: "all .3s var(--ease)",
              }}
              data-reveal
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                }}
              >
                {s.dateLabel}
                <div style={{ color: "var(--muted-soft)", marginTop: 6 }}>{s.readTime}</div>
              </div>
              <div>
                <h2 style={{ fontFamily: "'Inter'", fontWeight: 400, fontSize: 28, lineHeight: 1.15, letterSpacing: "-.02em", marginBottom: 12 }}>
                  {s.title}
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, maxWidth: "60ch" }}>
                  {s.excerpt}
                </p>
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono'",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  color: "var(--muted-soft)",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  alignSelf: "center",
                }}
              >
                Read →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
