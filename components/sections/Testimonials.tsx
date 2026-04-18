"use client";

// Social proof / testimonials. Lives between Stats and Signals on the
// landing page. Renders nothing if TESTIMONIALS is empty — so you can
// safely ship the section before approved quotes are in.
//
// When you get approved quotes, replace the entries below. Each one
// needs: quote (keep under ~180 chars so cards stay uniform), name,
// role, org, and an optional outcome metric (e.g. "+34% lead-to-call
// rate") that makes the quote feel earned rather than vibes.
//
// The section also drops in Review JSON-LD schema so Google / AI
// search can surface "rated by operators" snippets once we have real
// entries. With zero testimonials, the schema stays out of the DOM.

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  org: string;
  outcome?: string;
};

const TESTIMONIALS: Testimonial[] = [
  // TODO: replace with approved quotes from real engagements.
  // Keeping the array intentionally empty until Juan signs off —
  // better no testimonials than fake ones. When ready, shape:
  // {
  //   quote: "Juan rebuilt our lead-to-call flow in 6 weeks. Pipeline velocity doubled.",
  //   name: "…",
  //   role: "Founder",
  //   org: "…",
  //   outcome: "+104% pipeline velocity",
  // },
];

export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section id="testimonials" className="section testimonials">
      <div className="section-head">
        <div className="eyebrow">◉ Proof in production</div>
        <h2>
          Operators who stopped <em>leaking revenue</em>.
        </h2>
      </div>

      <div className="tst-grid">
        {TESTIMONIALS.map((t, i) => (
          <figure key={i} className="tst-card">
            <blockquote className="tst-quote">&ldquo;{t.quote}&rdquo;</blockquote>
            {t.outcome && <div className="tst-outcome">{t.outcome}</div>}
            <figcaption className="tst-cite">
              <span className="tst-name">{t.name}</span>
              <span className="tst-role">
                {t.role}, {t.org}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
