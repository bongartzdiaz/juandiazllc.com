import Link from "next/link";

const POSTS = [
  {
    date: "— 2026.04 · Essay",
    title: "Why operator tools should feel like instruments, not SaaS.",
  },
  {
    date: "— 2026.03 · Build log",
    title: "Shipping dual-theme design systems without drifting.",
  },
  {
    date: "— 2026.02 · Note",
    title: "A holding company as a creative container.",
  },
];

export function Signals() {
  return (
    <section id="signals">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">◉ 04 — Signals</div>
          <h2>Field notes,<br />build <em>logs.</em></h2>
        </div>
        <p>Short essays on designing operator tools, shipping dashboards that survive real environments, and running small studios at speed.</p>
      </div>
      <div className="signals">
        {POSTS.map((p, i) => (
          <Link key={i} href="/signals" className="sig" data-reveal>
            <div className="date">{p.date}</div>
            <h4>{p.title}</h4>
            <div className="tag">Read →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
