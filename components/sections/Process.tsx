const STEPS = [
  { n: "01", name: "Survey", title: <>Walk the <em>site.</em></>, body: "See what's actually going on before touching anything. Find the leaks, the workarounds, the tribal knowledge. Every real plan starts here." },
  { n: "02", name: "Blueprint", title: <>Draw the <em>plan.</em></>, body: "Sequence the moves. Every phase has a number attached. No vague \"strategy deck\" — a build plan a contractor could read." },
  { n: "03", name: "Build", title: <>Ship the <em>systems.</em></>, body: "Dashboards, automations, products, whole engines. Built to run at 3am on bad wifi, not just in the demo." },
  { n: "04", name: "Commission", title: <>Stress-<em>test.</em></>, body: "Verify every number. Run the edges. Nothing gets called \"live\" until the system is honest under load." },
  { n: "05", name: "Operate", title: <>Stay in the <em>control room.</em></>, body: "Monitor, tune, improve weekly. A revenue engine isn't a project — it's a living system. I stick around." },
];

export function Process() {
  return (
    <section className="process" id="process">
      <div className="proc-inner">
        <div className="sec-head" data-reveal style={{ marginBottom: 60 }}>
          <div>
            <div className="label">◉ 02 — How I work</div>
            <h2>Construction-trained.<br />Every build in <em>five phases.</em></h2>
          </div>
          <p>The same discipline that keeps a building on time and on budget is the one I apply to your revenue engine. No phase skipped, no number unverified.</p>
        </div>

        <div className="proc-grid" data-reveal>
          {STEPS.map((s) => (
            <div key={s.n} className="proc-step">
              <div>
                <div className="n"><em>{s.n}</em> / {s.name}</div>
                <h5>{s.title}</h5>
                <p>{s.body}</p>
              </div>
              <div className="dot" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
