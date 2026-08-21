"use client";

import { useT } from "@/lib/i18n/useT";

const VENTURES = [
  { id: "v1", wide: true,  href: "https://voltafy.nl",                   domain: "voltafy.nl",                   live: true,  soon: false },
  { id: "v2", wide: false, href: "https://performancetracker.nl",        domain: "performancetracker.nl",        live: true,  soon: false },
  { id: "v3", wide: false, href: "https://helpmijbesparen.nl",           domain: "helpmijbesparen.nl",           live: true,  soon: false },
  { id: "v4", wide: false, href: "https://salderingsregeling2027.nl",    domain: "salderingsregeling2027.nl",    live: true,  soon: false },
  // Philly heeft nog geen adres: philly.juandiazllc.com geeft NXDOMAIN. Geen
  // href en geen domeinnaam tot er iets te bezoeken is — zie lib/ventures.ts.
  { id: "v5", wide: true,  href: null,                                   domain: null,                           live: false, soon: true  },
];

export function Ventures() {
  const t = useT();
  return (
    <section id="ventures">
      <div className="sec-head" data-reveal>
        <div>
          <div className="label">{t("ventures.label")}</div>
          <h2>{t("ventures.title.a")}<br /><em>{t("ventures.title.b")}</em></h2>
        </div>
        <p>{t("ventures.sub")}</p>
      </div>
      <div className="vg">
        {VENTURES.map((v) => {
          const klasse = `v-card${v.wide ? " wide" : ""}`;
          const inhoud = (
            <>
              <div className="v-head">
                <div className="v-num">— {t(`ventures.${v.id}.cat`)}</div>
                <div className={`v-status${v.soon ? " soon" : ""}`}>
                  <span className="d" />
                  {v.soon ? t("ventures.status.soon") : t("ventures.status.live")}
                </div>
              </div>
              <div>
                <h3 dangerouslySetInnerHTML={{ __html: t(`ventures.${v.id}.title`) }} />
                <p>{t(`ventures.${v.id}.body`)}</p>
              </div>
              <div className="v-meta">
                {v.domain ? <span>{v.domain}</span> : <span />}
                {v.href && <div className="v-arrow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M7 17L17 7M17 7H9M17 7V15" />
                  </svg>
                </div>}
              </div>
            </>
          );

          // Zonder bestemming is dit geen link, dus ook geen <a>. Een anchor
          // zonder href is niet met het toetsenbord bereikbaar en draagt geen
          // linkrol, terwijl hij er identiek uitziet als zijn buren. Sinds #188
          // Philly's dode adres weghaalde zakte de homepage daarop van 0,95+
          // naar 0,92 op Lighthouse' SEO (`crawlable-anchors`) — vijftien runs
          // rood achter elkaar. De CSS hangt aan `.v-card` als klasse, niet aan
          // `a.v-card`, dus een <div> rendert exact hetzelfde.
          //
          // Krijgt Philly een adres, dan wordt dit vanzelf weer een link.
          return v.href ? (
            <a
              key={v.id}
              href={v.href}
              target={v.href.startsWith("http") ? "_blank" : undefined}
              rel={v.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={klasse}
              data-reveal
            >
              {inhoud}
            </a>
          ) : (
            <div key={v.id} className={klasse} data-reveal>
              {inhoud}
            </div>
          );
        })}
      </div>
    </section>
  );
}
