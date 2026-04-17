const VENTURES = [
  {
    wide: true,
    num: "— 001 / Platform",
    live: true,
    title: <><em>Voltafy</em> — energy intelligence for Dutch households and installers.</>,
    body: "The platform layer. Live monitoring, yield analytics, and a tight operator interface for the people keeping solar and battery systems honest. The flagship of the holding.",
    href: "https://voltafy.nl",
    domain: "voltafy.nl",
  },
  {
    num: "— 002 / Dashboard",
    live: true,
    title: <><em>Performance</em> Tracker — see what your system is really doing.</>,
    body: "Real-time yield, loss analysis, and alerts for solar owners and installers. Honest numbers, no vendor spin.",
    href: "https://performancetracker.nl",
    domain: "performancetracker.nl",
  },
  {
    num: "— 003 / Consumer",
    live: true,
    title: <>Help Mij <em>Besparen</em> — lower your energy bill, in plain Dutch.</>,
    body: "A calm, honest tool that tells Dutch households exactly where their money is leaking — and the moves that actually fix it.",
    href: "https://helpmijbesparen.nl",
    domain: "helpmijbesparen.nl",
  },
  {
    num: "— 004 / Policy",
    live: true,
    title: <><em>Salderingsregeling</em> 2027 — the phase-out, explained.</>,
    body: "The public field guide to the Dutch net-metering change. What it means, when it hits, and what solar owners should actually do about it.",
    href: "https://salderingsregeling2027.nl",
    domain: "salderingsregeling2027.nl",
  },
  {
    wide: true,
    num: "— 005 / US",
    live: false,
    title: <><em>Philly</em> — the US ops dashboard.</>,
    body: "The stateside sibling. Field-first interface for ground teams — dispatch, routing, live status, built to stay alive on bad networks. The first product under Juan Diaz LLC's US arm.",
    href: "#",
    domain: "philly.juandiazllc.com",
    soon: true,
  },
];

export function Ventures() {
  return (
    <section id="ventures">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">◉ 03 — Ventures</div>
          <h2>The playbook,<br /><em>in motion.</em></h2>
        </div>
        <p>Live products under the holding — each one the five-phase playbook applied to a real sector. Proof, not pitch. Visit any of them.</p>
      </div>
      <div className="vg">
        {VENTURES.map((v, i) => (
          <a
            key={i}
            href={v.href}
            target={v.href.startsWith("http") ? "_blank" : undefined}
            rel={v.href.startsWith("http") ? "noopener noreferrer" : undefined}
            className={`v-card${v.wide ? " wide" : ""}`}
            data-reveal
          >
            <div className="v-head">
              <div className="v-num">{v.num}</div>
              <div className={`v-status${v.soon ? " soon" : ""}`}>
                <span className="d" />
                {v.soon ? "Shipping" : "Live"}
              </div>
            </div>
            <div>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </div>
            <div className="v-meta">
              <span>{v.domain}</span>
              <div className="v-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M7 17L17 7M17 7H9M17 7V15" />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
