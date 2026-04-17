import { Countdown } from "./Countdown";

export function Story() {
  return (
    <section className="story" id="story">
      <div data-reveal>
        <div className="label" style={{ marginBottom: 40 }}>◉ 00 — Story</div>
        <h2 className="story-lead">
          <span className="q">&ldquo;</span>Most businesses don't have revenue
          <br />
          problems. They have <em>blueprint</em> problems.
          <span className="q" style={{ marginLeft: ".1em", marginRight: 0 }}>
            &rdquo;
          </span>
        </h2>
      </div>

      <div className="story-grid">
        <aside className="timeline" data-reveal>
          <div className="tl-item on">
            <div className="y">— Amsterdam / NL</div>
            <div className="t">Between two cultures, two languages, two ways of seeing.</div>
          </div>
          <div className="tl-item on">
            <div className="y">— Construction Management</div>
            <div className="t">Learned to plan the impossible and ship it on time.</div>
          </div>
          <div className="tl-item on">
            <div className="y">— The crossover</div>
            <div className="t">Realized every business is a construction project in disguise.</div>
          </div>
          <div className="tl-item on">
            <div className="y">— Voltafy · Performance Tracker</div>
            <div className="t">First live proof: energy operators, built right.</div>
          </div>
          <div className="tl-item on">
            <div className="y">— Help Mij Besparen · Salderingsregeling 2027</div>
            <div className="t">Extending the playbook into consumer and policy.</div>
          </div>
          <div className="tl-item on">
            <div className="y">— Philly</div>
            <div className="t">First step stateside. Field ops, US market.</div>
          </div>
          <div className="tl-item">
            <div className="y">— 2026 · Juan Diaz LLC</div>
            <div className="t">One founder. One holding. Every sector I touch.</div>
          </div>
        </aside>

        <div className="story-body" data-reveal>
          <p className="lead">
            I grew up between two worlds — the Netherlands and a family that taught me another one.
            My people called me <em>el cazador.</em> The hunter. Patient. Specific about what I'm after.
          </p>
          <p>
            I trained as a <b>construction manager</b> — how to plan impossible builds, sequence the
            moves, and ship without breaking the budget or the people. What nobody tells you is that
            the discipline transfers everywhere. <em>Every business is a construction project.</em>
          </p>
          <p>
            Most operators I meet aren't short on ambition. They're short on blueprint. Revenue leaks
            in the same five places, every time: no survey, no phasing, no commissioning, no control
            room, no honest numbers. So the business runs on hope instead of instruments.
          </p>
          <p>
            I started <b>Juan Diaz LLC</b> as the holding for the opposite of that. I ship revenue
            engines across <b>energy, real estate, hospitality</b> and adjacent industries — sometimes
            as my own products (Voltafy, Performance Tracker, Help Mij Besparen, Salderingsregeling
            2027), sometimes as a partner for yours. Same five phases every time.
          </p>
          <p>
            The bet is simple: <em>the next decade of great software gets built by operators, for
            operators.</em> I'd rather be one of them than sell to them — and bring a few along while
            I'm at it.
          </p>

          <div className="story-sign">
            <div className="sig-mark">Juan</div>
            <div className="who">
              <b>Juan Stefan Diaz</b>
              Sole founder · Juan Diaz LLC · Construction-trained operator
            </div>
          </div>
        </div>
      </div>

      <Countdown />
    </section>
  );
}
