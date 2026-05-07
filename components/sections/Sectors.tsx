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
  // ix + tags previously hardcoded English; now keyed under sectors.<id>.* so
  // NL/DE/ES visitors get translated category labels and tag chips. Tags stay
  // partially English in NL/DE/ES where the term is industry shorthand
  // (Solar, Retrofit, ESG) and translated where there's a clean equivalent
  // (Installers/Installateurs, Channels/Kanalen). See dict.ts.
  const cards = [
    { slug: "energy",      idKey: "e",   icon: ICONS.energy },
    { slug: "real-estate", idKey: "re",  icon: ICONS.re },
    { slug: "hospitality", idKey: "h",   icon: ICONS.hosp },
    { slug: "adjacent",    idKey: "adj", icon: ICONS.adj },
  ].map((s) => ({
    ...s,
    ix: t(`sectors.${s.idKey}.ix`),
    titleA: t(`sectors.${s.idKey}.title.a`),
    titleB: t(`sectors.${s.idKey}.title.b`),
    body: t(`sectors.${s.idKey}.body`),
    tags: [
      t(`sectors.${s.idKey}.tag.1`),
      t(`sectors.${s.idKey}.tag.2`),
      t(`sectors.${s.idKey}.tag.3`),
      t(`sectors.${s.idKey}.tag.4`),
    ],
  }));

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
