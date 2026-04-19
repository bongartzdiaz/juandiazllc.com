import type { Metadata } from "next";
import Link from "next/link";
import { SECTORS } from "@/lib/sectors";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Sectors — where the playbook applies",
    description:
      "Energy, real estate, hospitality, adjacent. The five-phase method applied to the P&Ls that need it most.",
    alternates: buildAlternates(l, "/sectors"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default async function SectorsIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">{t("sectors.page.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("sectors.page.title") }} />
        <p>{t("sectors.page.lede")}</p>
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
