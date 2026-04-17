import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SIGNALS, getSignal } from "@/lib/signals";

export function generateStaticParams() {
  return SIGNALS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = getSignal(slug);
  if (!s) return { title: "Signal not found" };
  return { title: s.title, description: s.excerpt };
}

export default async function SignalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = getSignal(slug);
  if (!s) notFound();

  const idx = SIGNALS.findIndex((x) => x.slug === s.slug);
  const prev = idx > 0 ? SIGNALS[idx - 1] : null;
  const next = idx < SIGNALS.length - 1 ? SIGNALS[idx + 1] : null;

  return (
    <>
      <header className="page-hero" style={{ paddingBottom: 32 }}>
        <Link href="/signals" className="eyebrow" style={{ display: "inline-block", marginBottom: 24 }}>
          ← All signals
        </Link>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            marginBottom: 20,
            fontFamily: "'JetBrains Mono'",
            fontSize: 11,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          <span style={{ color: "var(--accent)" }}>— {s.dateLabel}</span>
          <span>·</span>
          <span>{s.tag}</span>
          <span>·</span>
          <span>{s.readTime}</span>
        </div>
        <h1>{s.title}</h1>
        <p style={{ maxWidth: "60ch" }}>{s.excerpt}</p>
      </header>

      <article className="long">
        {s.body.map((block, i) => {
          if (block.type === "h2") return <h2 key={i}>{block.text as string}</h2>;
          if (block.type === "quote") return <blockquote key={i}>{block.text as string}</blockquote>;
          if (block.type === "list" && Array.isArray(block.text)) {
            return (
              <ul key={i} style={{ color: "var(--text)", fontSize: 18, lineHeight: 1.7, paddingLeft: 24, marginBottom: 28 }}>
                {block.text.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          }
          return <p key={i}>{block.text as string}</p>;
        })}

        <div
          style={{
            marginTop: 60,
            paddingTop: 32,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, letterSpacing: ".1em", color: "var(--muted-soft)", textTransform: "uppercase" }}>
            — Juan Stefan Diaz
          </div>
          <Link className="btn primary btn-mag" href="/contact">
            Work together <span className="arr">→</span>
          </Link>
        </div>
      </article>

      <section style={{ padding: "40px 40px 140px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {prev ? (
            <Link
              href={`/signals/${prev.slug}`}
              style={{
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "var(--panel)",
                transition: "all .3s var(--ease)",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--muted-soft)", textTransform: "uppercase", marginBottom: 10 }}>
                ← Previous
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.015em", lineHeight: 1.3 }}>
                {prev.title}
              </div>
            </Link>
          ) : <div />}
          {next ? (
            <Link
              href={`/signals/${next.slug}`}
              style={{
                padding: 24,
                border: "1px solid var(--line)",
                borderRadius: 14,
                background: "var(--panel)",
                textAlign: "right",
                transition: "all .3s var(--ease)",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, letterSpacing: ".14em", color: "var(--muted-soft)", textTransform: "uppercase", marginBottom: 10 }}>
                Next →
              </div>
              <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-.015em", lineHeight: 1.3 }}>
                {next.title}
              </div>
            </Link>
          ) : <div />}
        </div>
      </section>
    </>
  );
}
