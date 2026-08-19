"use client";

// Geanonimiseerde operator-uitkomsten. **Sinds 2026-08-19 niet gemonteerd.**
//
// WAAROM DIT BLOK VAN DE HOMEPAGE AF IS
//
// De regel hieronder stond hier vanaf dag één: "Never invent a number. Every
// metric here must be traceable to a real engagement. If a slot needs updating,
// delete the card rather than fudge it." De bron van de vier cijfers is nooit
// vastgelegd — niet in dit bestand, niet in de commit die het blok bracht
// (26b352b, 2026-04-18), nergens.
//
// Drie maanden later legde `docs/claims.md` het tegenovergestelde vast:
//
//     | Client results, revenue figures, testimonials | ❌ none exist; do not imply any |
//
// Twee documenten in dezelfde repo, één van de twee is onjuist. claims.md is
// later, is geschreven tijdens een audit, en is per regel 1 van dat bestand de
// enige bron: "A number appears here or it does not get published." Dus wint
// claims.md tot iemand met bewijs komt.
//
// Wat het erger maakte dan vier losse getallen: `results.sub` beloofde de lezer
// in vier talen dat elk cijfer uit een live opdracht komt en dat een cijfer
// zonder onderbouwing er niet komt te staan. Een claim die zichzelf
// verifieert is niet nét-niet-onderbouwd; hij zegt het tegendeel van wat waar
// is.
//
// HET COMPONENT BLIJFT STAAN, en de vertalingen ook. De kopij deugt; alleen de
// dekking ontbreekt. Terugzetten kost één regel in app/[locale]/page.tsx —
// zodra de cijfers in docs/claims.md staan, mét opdracht en datum. Doe je het
// zonder, dan wordt ResultsStrip.test.ts rood.
//
// Rules (ongewijzigd, ze waren goed):
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
