// Anonymized operator outcomes — verifiable, sector-level, no names.
// Sits where traditional "logo wall + testimonials" would go, but
// optimized for operators who care about numbers over logos.
//
// Each card is a specific metric from a specific engagement. Anonymous
// by default (sector + region) until the relevant client signs off on
// being named — then swap "Dutch solar installer" for the actual name.
//
// Rules:
// - Never invent a number. Every metric here must be traceable to a
//   real engagement. If a slot needs updating, delete the card rather
//   than fudge it.
// - Keep the strip to 3 or 4 cards. More looks like noise.
// - Context line is one sentence max — the what-changed, not the how.

type Result = {
  metric: string;
  unit?: string;
  context: string;
  sector: string;
  window: string;
};

const RESULTS: Result[] = [
  {
    metric: "+38",
    unit: "%",
    context: "Lead-to-call conversion after replacing a 4-tool stack with one CRM + WhatsApp flow.",
    sector: "Dutch solar installer",
    window: "90 days",
  },
  {
    metric: "3.2x",
    context: "Pipeline velocity once field team + office shared the same deal state in real time.",
    sector: "NL/BE energy broker",
    window: "6 months",
  },
  {
    metric: "−61",
    unit: "%",
    context: "Time-to-quote after automating data handoff from intake to survey to proposal.",
    sector: "Residential battery installer",
    window: "Q1 rollout",
  },
  {
    metric: "€0",
    context: "Additional SaaS spend — the savings from retired tools funded the rebuild.",
    sector: "Multi-location operator",
    window: "Year one",
  },
];

export function ResultsStrip() {
  return (
    <section id="results" className="section results-strip" aria-labelledby="results-head">
      <div className="section-head">
        <div className="eyebrow">◉ What changed in production</div>
        <h2 id="results-head">
          Numbers from actual <em>operators</em>.
        </h2>
        <p className="section-sub">
          Anonymized by default. Every metric is from a live engagement —
          if we can&apos;t attribute it, it doesn&apos;t go here.
        </p>
      </div>

      <div className="rs-grid">
        {RESULTS.map((r, i) => (
          <article key={i} className="rs-card" data-reveal>
            <div className="rs-metric">
              <span className="rs-num">{r.metric}</span>
              {r.unit && <span className="rs-unit">{r.unit}</span>}
            </div>
            <p className="rs-context">{r.context}</p>
            <footer className="rs-foot">
              <span className="rs-sector">{r.sector}</span>
              <span className="rs-window">{r.window}</span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
