import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="philly-hero">
        <div className="philly-hero-inner">
          <span className="chip">◉ US field operations · pilot 2026</span>
          <h1>
            Ground teams.<br />
            <em>Live</em> dispatch.<br />
            Honest numbers.
          </h1>
          <p>
            <b style={{ color: "var(--text)", fontWeight: 500 }}>Philly</b> is the field-first ops
            dashboard under Juan Diaz LLC&apos;s US arm. Offline-ready, tap-friendly, built for the
            truck, not the demo.
          </p>
          <div className="btns">
            <Link className="btn primary" href="/login">Sign in →</Link>
            <a className="btn ghost" href="https://juandiazllc.com/work/philly">About the build ↗</a>
          </div>
        </div>
      </section>

      <div className="philly-stripe">
        <div className="philly-stripe-inner">
          <div className="stat">
            <div className="n">US</div>
            <div className="l">Market</div>
          </div>
          <div className="stat">
            <div className="n"><em>5</em></div>
            <div className="l">Phases every build</div>
          </div>
          <div className="stat">
            <div className="n">24/<em>7</em></div>
            <div className="l">Ops rhythm</div>
          </div>
          <div className="stat">
            <div className="n">2026</div>
            <div className="l">Pilot window</div>
          </div>
        </div>
      </div>
    </>
  );
}
