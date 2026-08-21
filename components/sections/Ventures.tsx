"use client";

import { useT } from "@/lib/i18n/useT";
import type { VentureKaart } from "@/lib/ventures";

/* Alleen presentatie. Welke ventures er zijn, waar ze draaien en of ze al
 * draaien staat in lib/ventures.ts en wordt daar bewaakt; dit bestand droeg
 * die feiten tot 2026-08-21 een tweede keer, met een eigen adresveld erin.
 *
 * Wat hier wél hoort: de sleutel waaronder de kopij in dict.ts staat, en of de
 * kaart over twee kolommen loopt. Dat is opmaak, geen feit over het product.
 *
 * De gate in Ventures.test.ts eist dat deze tabel exact de slugs uit VENTURES
 * dekt — een nieuwe venture zonder regel hier valt om, en een regel die naar
 * een verdwenen venture wijst ook. */
const PRESENTATIE: Record<string, { dictId: string; wide: boolean }> = {
  "voltafy": { dictId: "v1", wide: true },
  "performance-tracker": { dictId: "v2", wide: false },
  "help-mij-besparen": { dictId: "v3", wide: false },
  "salderingsregeling-2027": { dictId: "v4", wide: false },
  "philly": { dictId: "v5", wide: true },
};

export function Ventures({ kaarten }: { kaarten: VentureKaart[] }) {
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
        {kaarten.map((k) => {
          const opmaak = PRESENTATIE[k.slug];
          if (!opmaak) return null;
          const { dictId, wide } = opmaak;
          const klasse = `v-card${wide ? " wide" : ""}`;
          const inhoud = (
            <>
              <div className="v-head">
                <div className="v-num">— {t(`ventures.${dictId}.cat`)}</div>
                <div className={`v-status${k.live ? "" : " soon"}`}>
                  <span className="d" />
                  {k.live ? t("ventures.status.live") : t("ventures.status.soon")}
                </div>
              </div>
              <div>
                <h3 dangerouslySetInnerHTML={{ __html: t(`ventures.${dictId}.title`) }} />
                <p>{t(`ventures.${dictId}.body`)}</p>
              </div>
              <div className="v-meta">
                {k.domain ? <span>{k.domain}</span> : <span />}
                {k.external && <div className="v-arrow">
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
          //
          // `external` is per gate in ventures.test.ts altijd een volledige
          // https-URL of null, dus target en rel hoeven niet meer voorwaardelijk.
          return k.external ? (
            <a
              key={k.slug}
              href={k.external}
              target="_blank"
              rel="noopener noreferrer"
              className={klasse}
              data-reveal
            >
              {inhoud}
            </a>
          ) : (
            <div key={k.slug} className={klasse} data-reveal>
              {inhoud}
            </div>
          );
        })}
      </div>
    </section>
  );
}
