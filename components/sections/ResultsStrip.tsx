"use client";

// Geanonimiseerde operator-uitkomsten — verifieerbaar, op sectorniveau, geen
// namen. Staat waar een logowall met quotes zou staan, maar dan voor lezers die
// cijfers zwaarder wegen dan logo's.
//
// WAAROM ER EEN POORT OMHEEN STAAT
//
// Van 2026-04-18 tot 2026-08-19 stonden deze vier cijfers live in vier talen
// terwijl `docs/claims.md` op regel 289 het tegendeel bijhield: "Client
// results, revenue figures, testimonials — none exist; do not imply any."
//
// De cijfers bleken echt (Juan, 2026-08-19). De fout zat dus niet in de
// getallen maar in het dossier: regel 1 van claims.md is "A number appears
// here or it does not get published", en dat was vier maanden lang niet zo.
// Ondertussen beloofde `results.sub` de lezer wél dat elk cijfer uit een live
// opdracht komt — een claim die voor zichzelf instaat, zonder dat iemand hem
// nog kon controleren.
//
// Dat is het echte risico van dit blok: niet dat het liegt, maar dat niemand
// het verschil kan zien. `ResultsStrip.test.ts` haalt dat verschil uit de
// oplettendheid en zet het in de suite. Wil je een kaart toevoegen of een
// cijfer wijzigen, dan gaat de poort rood tot het in claims.md staat.
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

import { useT } from "@/lib/i18n/useT";

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

export function ResultsStrip() {
  const t = useT();
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
