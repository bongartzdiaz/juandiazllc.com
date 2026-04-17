"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

const ICONS = {
  energy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" strokeLinejoin="round" />
    </svg>
  ),
  re: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 21V10l9-7 9 7v11H3z" strokeLinejoin="round" />
      <path d="M9 21v-8h6v8" />
    </svg>
  ),
  hosp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 21V9l8-5 8 5v12" strokeLinejoin="round" />
      <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
      <circle cx="12" cy="10" r="1.2" />
    </svg>
  ),
  adj: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
};

export function Sectors() {
  const t = useT();
  const cards = [
    { slug: "energy", ix: "— 01 / Energy", titleA: t("sectors.e.title.a"), titleB: t("sectors.e.title.b"), body: t("sectors.e.body"), icon: ICONS.energy, tags: ["Solar", "Installers", "Metering", "Post-2027"] },
    { slug: "real-estate", ix: "— 02 / Real Estate", titleA: t("sectors.re.title.a"), titleB: t("sectors.re.title.b"), body: t("sectors.re.body"), icon: ICONS.re, tags: ["Retrofit", "Portfolio", "Tenant ops", "ESG"] },
    { slug: "hospitality", ix: "— 03 / Hospitality", titleA: t("sectors.h.title.a"), titleB: t("sectors.h.title.b"), body: t("sectors.h.body"), icon: ICONS.hosp, tags: ["Revenue ops", "Channels", "Staff", "Guest data"] },
    { slug: "adjacent", ix: "— 04 / Adjacent", titleA: t("sectors.adj.title.a"), titleB: t("sectors.adj.title.b"), body: t("sectors.adj.body"), icon: ICONS.adj, tags: ["Field ops", "Fleet", "Retail", "Services"] },
  ];

  return (
    <section id="sectors">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">{t("sectors.label")}</div>
          <h2>{t("sectors.title.a")} <em>{t("sectors.title.b")}</em><br />{t("sectors.title.c")}</h2>
        </div>
        <p>{t("sectors.sub")}</p>
      </div>
      <div className="sectors-grid">
        {cards.map((s, i) => (
          <Link key={i} href={`/sectors/${s.slug}`} className="sec-card" data-reveal>
            <div>
              <div className="ix">{s.ix}</div>
              <div className="ico">{s.icon}</div>
              <h4>{s.titleA} <em>{s.titleB}</em></h4>
              <p>{s.body}</p>
            </div>
            <div className="tags">
              {s.tags.map((tag) => (
                <span key={tag} className="tag">{tag}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
