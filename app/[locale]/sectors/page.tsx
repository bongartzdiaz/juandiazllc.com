import type { Metadata } from "next";
import Link from "next/link";
import { SECTORS } from "@/lib/sectors";

export const metadata: Metadata = {
  title: "Sectors — where the playbook applies",
  description:
    "Energy, real estate, hospitality, adjacent. The five-phase method applied to the P&Ls that need it most.",
};

export default function SectorsIndex() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Sectors</div>
        <h1>Where the <em>playbook</em> applies.</h1>
        <p>
          Different industries, same five phases. Each of these pages is a real survey — the
          common revenue leaks in the sector, how the method runs against them, and the proof
          points I can point to (or the slot still open for a first partner).
        </p>
      </header>
      <section style={{ padding: "80px 40px 160px", maxWidth: "var(--max)", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {SECTORS.map((s) => (
            <Link key={s.slug} href={`/sectors/${s.slug}`} className="sec-card" data-reveal style={{ minHeight: 340 }}>
              <div>
                <div className="ix">— {s.name}</div>
                <h4 style={{ marginTop: 14, fontSize: 26, lineHeight: 1.12 }}>{s.tagline}</h4>
                <p>{s.summary.length > 180 ? s.summary.slice(0, 180) + "…" : s.summary}</p>
              </div>
              <div className="tags">
                {s.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
