"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

const POSTS = [
  { date: "— 2026.04 · Essay", title: "Why operator tools should feel like instruments, not SaaS." },
  { date: "— 2026.03 · Build log", title: "Shipping dual-theme design systems without drifting." },
  { date: "— 2026.02 · Note", title: "A holding company as a creative container." },
];

export function Signals() {
  const t = useT();
  return (
    <section id="signals">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">{t("signals.label")}</div>
          <h2>{t("signals.title.a")}<br />{t("signals.title.b").replace(/\.$/, "")}<em>.</em></h2>
        </div>
        <p>{t("signals.sub")}</p>
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
