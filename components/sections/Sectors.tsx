import Link from "next/link";

const SECTORS = [
  {
    ix: "— 01 / Energy",
    title: <>Energy &amp; <em>solar</em></>,
    body: "Solar portfolios, installers, households, grid operators. Post-salderingsregeling software that actually earns its keep.",
    tags: ["Solar", "Installers", "Metering", "Post-2027"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    ix: "— 02 / Real Estate",
    title: <>Real <em>estate</em></>,
    body: "Portfolio dashboards, retrofit planning, ESG reporting, tenant ops. Numbers the asset manager can actually trust.",
    tags: ["Retrofit", "Portfolio", "Tenant ops", "ESG"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M3 21V10l9-7 9 7v11H3z" strokeLinejoin="round" />
        <path d="M9 21v-8h6v8" />
      </svg>
    ),
  },
  {
    ix: "— 03 / Hospitality",
    title: <>Hospitality &amp; <em>revenue</em></>,
    body: "Channel intelligence, revenue ops, staff tooling, guest data. Turn the gut-feel pricing into an honest instrument.",
    tags: ["Revenue ops", "Channels", "Staff", "Guest data"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M4 21V9l8-5 8 5v12" strokeLinejoin="round" />
        <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
        <circle cx="12" cy="10" r="1.2" />
      </svg>
    ),
  },
  {
    ix: "— 04 / Adjacent",
    title: <>Anywhere <em>else</em></>,
    body: "Logistics, retail, field services, frontier industries. If it has operators and bad software, the playbook applies.",
    tags: ["Field ops", "Fleet", "Retail", "Services"],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    ),
  },
];

export function Sectors() {
  return (
    <section id="sectors">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">◉ 01 — Where I work</div>
          <h2>Every sector with <em>operators</em><br />and a P&amp;L.</h2>
        </div>
        <p>Different industries, same leaks. I focus where the operational complexity is highest and the software is weakest — that&apos;s where the revenue is hiding.</p>
      </div>
      <div className="sectors-grid">
        {SECTORS.map((s, i) => (
          <Link key={i} href="/contact" className="sec-card" data-reveal>
            <div>
              <div className="ix">{s.ix}</div>
              <div className="ico">{s.icon}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
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
  );
}
