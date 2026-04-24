// Anonymized operator outcomes — verifiable, sector-level, no names.
// Sits where traditional "logo wall + testimonials" would go, but
// optimized for operators who care about numbers over logos.
//
// Rules:
// - Never invent a number. Every metric here must be traceable to a
//   real engagement. If a slot needs updating, delete the card rather
//   than fudge it.
// - Keep the strip to 3 or 4 cards. More looks like noise.
// - Context line is one sentence max — the what-changed, not the how.
//
// Copy (context/sector/window) flows through translate() so NL/DE/ES
// readers see localized strings, not the English fallback.

import { translate, type Locale } from "@/lib/i18n/dict";

type Result = {
  id: string;
  metric: string;
  unit?: string;
};

const RESULTS: Result[] = [
  { id: "r1", metric: "+38", unit: "%" },
  { id: "r2", metric: "3.2x" },
  { id: "r3", metric: "−61", unit: "%" },
  { id: "r4", metric: "€0" },
];

export function ResultsStrip({ locale }: { locale: Locale }) {
  const t = (k: string) => translate(locale, k);
  return (
    <section id="results" className="section results-strip" aria-labelledby="results-head">
      <div className="section-head">
        <div className="eyebrow">{t("results.eyebrow")}</div>
        <h2 id="results-head" dangerouslySetInnerHTML={{ __html: t("results.title") }} />
        <p className="section-sub">{t("results.sub")}</p>
      </div>

      <div className="rs-grid">
        {RESULTS.map((r) => (
          <article key={r.id} className="rs-card" data-reveal>
            <div className="rs-metric">
              <span className="rs-num">{r.metric}</span>
              {r.unit && <span className="rs-unit">{r.unit}</span>}
            </div>
            <p className="rs-context">{t(`results.${r.id}.ctx`)}</p>
            <footer className="rs-foot">
              <span className="rs-sector">{t(`results.${r.id}.sector`)}</span>
              <span className="rs-window">{t(`results.${r.id}.window`)}</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
