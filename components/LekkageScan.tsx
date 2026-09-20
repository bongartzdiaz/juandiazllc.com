"use client";

/* De lekkage-scan. Vragen en scoremechanisme staan in lib/lekkage-scan.ts,
 * de kopij per taal in lib/lekkage-scan-taal.ts; dit bestand is alleen
 * opmaak en toestand.
 *
 * DRIE DINGEN DIE OPZET ZIJN, ZODAT NIEMAND ZE "REPAREERT":
 *
 * 1. De uitslag staat achter een GATE: naam, bedrijf en e-mailadres, en dan
 *    pas de drie lekken. Sinds 2026-09-20 (avond), op Juans woord — *so that
 *    you can actually get leads*. Tot die avond was het adres optioneel en
 *    stond de uitslag meteen op het scherm; docs/lead-magnet.md §10 legt de
 *    omkering vast. De actie schrijft de lead naar marketing.leads (Telegram
 *    en bevestiging via de triggers daar) en, alleen met het losse vinkje,
 *    het adres naar marketing.subscribers voor de reeks van drie mails
 *    (Telecommunicatiewet 11.7: de gate koopt de uitslag, niet de reeks).
 *    Zie app/actions/scan-opvang.ts. De contactroute onderaan blijft ernaast
 *    staan en draagt `interest=lekkage-scan` in `source`.
 * 2. De kopij komt uit TEKSTEN[taal] en niet uit dict.ts. Tot 2026-09-20
 *    bestond de scan alleen op /nl en stond alles hier hardgecodeerd; sinds
 *    /tools/leak-scan (en, de) draagt lib/lekkage-scan-taal.ts de drie talen
 *    naast elkaar, met de vragen erbij. Het knoplabel is de uitzondering: dat
 *    komt uit `cta.book`, omdat lib/i18n/eerste-stap.test.ts terecht eist dat
 *    elke ingang naar een gesprek overal dezelfde naam draagt.
 * 3. Bij nul lekken staat er dat er niets gevonden is. Een scan die altijd iets
 *    vindt is een verkoopinstrument en geen diagnose, en dit publiek merkt dat
 *    verschil binnen twee vragen.
 * 4. De twee invulvelden zijn OPTIONEEL en blokkeren de knop niet. Ze vragen om
 *    een getal uit de eigen administratie, niet om een schatting — en wie dat
 *    getal nu niet bij de hand heeft moet de scan gewoon kunnen afmaken. Een
 *    leeg veld levert dan ook niets op in de uitslag: geen nul, geen aanname. */

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/seo/branding";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { vraagUitslagAan, type ScanOpvangState } from "@/app/actions/scan-opvang";
import { TOESTEMMING_WAARDE } from "@/lib/scan-opvang";
import { TEKSTEN, vragenVoor, type ScanTaal } from "@/lib/lekkage-scan-taal";
import {
  alleBeantwoord,
  duidMetingen,
  scoor,
  type Antwoorden,
  type Metingen,
} from "@/lib/lekkage-scan";

const DATUM_LOCALE: Record<ScanTaal, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE" };

export function LekkageScan({ taal }: { taal: ScanTaal }) {
  const { locale, t } = useLocale();
  const T = TEKSTEN[taal];
  const { vragen, blokken } = useMemo(() => vragenVoor(taal), [taal]);

  const [antwoorden, setAntwoorden] = useState<Antwoorden>({});
  const [metingen, setMetingen] = useState<Metingen>({});
  const [getoond, setGetoond] = useState(false);

  const compleet = alleBeantwoord(antwoorden, vragen);
  const lekken = useMemo(() => scoor(antwoorden, 3, vragen, blokken), [antwoorden, vragen, blokken]);
  const gemeten = useMemo(() => duidMetingen(metingen, vragen), [metingen, vragen]);
  const open = vragen.filter((v) => antwoorden[v.id] === undefined).length;

  /* De datum staat op het geprinte vel. Hij wordt hier gezet en niet bij het
     renderen berekend: een uitslag die je vandaag opslaat en volgende maand
     terugvindt, moet zeggen wanneer hij gemaakt is. Leeg tot de uitslag
     getoond wordt, dus er is geen server/client-verschil om over te
     struikelen. */
  const [datum, setDatum] = useState("");

  /* Zesde Plausible-doel. De vijf bestaande meten allemaal een KLIK; dit is
     het eerste dat een AFRONDING meet. Wie alle vragen invult en de
     uitslag leest, is een ander signaal dan wie op een knop drukt -- en dat
     is precies de vraag "wat gebeurt er na de klik".

     Het aantal lekken gaat mee als eigenschap, zodat nul lekken te scheiden
     is van vier. Plausible wil een string, vandaar String().

     Het meldt EENMAAL per bezoek. `getoond` gaat alleen naar true en de
     vragen blijven onder de uitslag staan, dus wie daarna een antwoord
     bijstelt verandert `lekken.length` -- een dependency van dit effect.
     Zonder de ref hieronder telde datzelfde bezoek twee keer mee, en dan
     meet het doel bezoekers noch afrondingen. De dependency zelf moet
     blijven staan: zonder hem meldt het doel een verouderd aantal.

     LET OP: dit doel bestaat nog niet in het Plausible-dashboard. Tot iemand
     het daar aanmaakt wordt het binnengehaald en weggegooid, net als de vijf
     andere. Zie MANUAL_TASKS.md. */
  const gemeld = useRef(false);

  useEffect(() => {
    if (!getoond || !compleet) {
      gemeld.current = false;
      return;
    }
    setDatum(new Date().toLocaleDateString(DATUM_LOCALE[taal], {
      day: "numeric",
      month: "long",
      year: "numeric",
    }));
    if (gemeld.current) return;
    gemeld.current = true;
    /* typeof, geen optionele aanroep. `?.()` valt alleen terug op null en
       undefined; een truthy niet-functie werpt een TypeError, en dit staat
       in een effect -- dus dat sloopt de React-boom in plaats van stil
       niets te meten. Zie lib/plausible-aanroep.test.ts. */
    const w = window as unknown as {
      plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
    };
    if (typeof w.plausible === "function") {
      w.plausible("Scan Voltooid", { props: { lekken: String(lekken.length) } });
    }
  }, [getoond, compleet, lekken.length, taal]);

  /* De gate. Het formulier post naar een server action; pas op `ok` rendert
     de uitslag eronder. Zevende Plausible-doel `Uitslag Aangevraagd`, met
     dezelfde eigenschap `lekken`, zodat een aanvraag met vier lekken te
     scheiden is van een met nul. Zelfde ref-guard als hierboven: eenmaal per
     geslaagde inzending. */
  const [opvang, opvangActie, opvangBezig] = useActionState(vraagUitslagAan, {
    status: "idle",
  } as ScanOpvangState);
  const aangevraagdGemeld = useRef(false);
  const uitslagZichtbaar = getoond && compleet && opvang.status === "ok";
  /* Alle antwoorden gaan als JSON mee; de server rekent de uitslag
     zelf uit voor het bericht aan Juan, uit dezelfde antwoorden. */
  const antwoordenJson = useMemo(
    () => JSON.stringify(Object.fromEntries(vragen.map((v) => [v.id, antwoorden[v.id] ?? false]))),
    [antwoorden, vragen],
  );

  useEffect(() => {
    if (opvang.status !== "ok") {
      aangevraagdGemeld.current = false;
      return;
    }
    if (aangevraagdGemeld.current) return;
    aangevraagdGemeld.current = true;
    const w = window as unknown as {
      plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
    };
    if (typeof w.plausible === "function") {
      w.plausible("Uitslag Aangevraagd", { props: { lekken: String(lekken.length) } });
    }
  }, [opvang.status, lekken.length]);

  function kies(id: string, waarde: boolean) {
    setAntwoorden((vorig) => ({ ...vorig, [id]: waarde }));
  }

  /* Een leeg veld wordt `undefined` en geen 0 — anders is "ik heb het niet
   * opgezocht" niet te onderscheiden van "het antwoord is nul uur". */
  function meet(id: string, ruw: string) {
    const schoon = ruw.trim().replace(",", ".");
    const waarde = schoon === "" ? undefined : Number(schoon);
    setMetingen((vorig) => ({
      ...vorig,
      [id]: waarde !== undefined && Number.isFinite(waarde) ? waarde : undefined,
    }));
  }

  return (
    <div className="scan">
      {blokken.map((blok) => (
        <section className="scan-blok" key={blok.id}>
          <h2 className="scan-blok-naam">{blok.naam}</h2>
          {vragen.filter((v) => v.blok === blok.id).map((v) => (
            <fieldset className="scan-vraag" key={v.id}>
              <legend>{v.vraag}</legend>
              <div className="scan-keuze">
                {[
                  { label: T.ja, waarde: true },
                  { label: T.nee, waarde: false },
                ].map((k) => (
                  <label className="scan-optie" key={k.label}>
                    <input
                      type="radio"
                      name={v.id}
                      checked={antwoorden[v.id] === k.waarde}
                      onChange={() => kies(v.id, k.waarde)}
                    />
                    <span>{k.label}</span>
                  </label>
                ))}
              </div>
              {v.meting && (
                <div className="scan-meting">
                  <p className="scan-meting-opdracht">{v.meting.opdracht}</p>
                  <label className="scan-meting-veld">
                    <span>{v.meting.label}</span>
                    <span className="scan-meting-invoer">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        inputMode="decimal"
                        value={metingen[v.id] ?? ""}
                        onChange={(e) => meet(v.id, e.target.value)}
                      />
                      <span className="scan-meting-eenheid">{v.meting.eenheid}</span>
                    </span>
                  </label>
                  <p className="scan-meting-uitleg">{T.metingOptioneel}</p>
                </div>
              )}
            </fieldset>
          ))}
        </section>
      ))}

      <div className="scan-actie">
        <button
          type="button"
          className="btn primary"
          disabled={!compleet}
          onClick={() => setGetoond(true)}
        >
          {T.knopToon}
        </button>
        <p className="scan-teller" aria-live="polite">
          {compleet ? T.alleBeantwoord : T.nogTeGaan(open)}
        </p>
      </div>

      {getoond && compleet && !uitslagZichtbaar && (
        <section className="scan-gate" aria-live="polite">
          <h2>{T.gateKop}</h2>
          <p>{T.gateP}</p>
          <form className="nl-form scan-opvang" action={opvangActie}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="antwoorden" value={antwoordenJson} />
            <label className="sr-only" htmlFor="scan-name">
              {T.naamLabel}
            </label>
            <input
              id="scan-name"
              name="name"
              type="text"
              placeholder={T.naamPlaceholder}
              required
              minLength={2}
              autoComplete="name"
            />
            <label className="sr-only" htmlFor="scan-company">
              {T.bedrijfLabel}
            </label>
            <input
              id="scan-company"
              name="company"
              type="text"
              placeholder={T.bedrijfPlaceholder}
              required
              minLength={2}
              autoComplete="organization"
            />
            <label className="sr-only" htmlFor="scan-email">
              {T.emailLabel}
            </label>
            <input
              id="scan-email"
              name="email"
              type="email"
              placeholder={T.placeholder}
              required
              autoComplete="email"
            />
            <p className="scan-reeks">{T.reeksP}</p>
            <label className="scan-toestemming">
              <input
                type="checkbox"
                name="toestemming"
                value={TOESTEMMING_WAARDE}
              />
              <span>{T.toestemming}</span>
            </label>
            <div className="hp-field" aria-hidden="true">
              <label htmlFor="scan-website">Website</label>
              <input
                id="scan-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <button type="submit" className="btn primary" disabled={opvangBezig}>
              {opvangBezig ? T.bezig : T.knopUitslag}
            </button>
            {opvang.status === "err" && (
              <div className="nl-msg err">{opvang.message}</div>
            )}
          </form>
        </section>
      )}

      {uitslagZichtbaar && (
        <section className="scan-uitslag" aria-live="polite">
          {/* Alleen op papier zichtbaar. Zonder deze kop draagt het vel geen
              datum en geen afzender, en dan is het over een maand een anoniem
              A4'tje dat niemand kan thuisbrengen. Staat in de DOM en niet in
              CSS-content, zodat het echte tekst blijft die je kunt selecteren
              en die een schermlezer kan bereiken. */}
          <div className="scan-printkop">
            <p className="scan-printkop-titel">{T.printkopTitel}{datum ? " · " + datum : ""}</p>
            <p className="scan-printkop-bron">{T.printkopBron}</p>
          </div>

          {lekken.length === 0 ? (
            <>
              <h2>{T.nulKop}</h2>
              <p>{T.nulP}</p>
            </>
          ) : (
            <>
              <h2>{lekken.length === 1 ? T.lekKopEen : T.lekKopMeer(lekken.length)}</h2>
              <ol className="scan-lekken">
                {lekken.map((lek, i) => (
                  <li key={lek.blok}>
                    <h3>
                      <span className="scan-rang">{i + 1}</span> {lek.lek}
                    </h3>
                    <p className="scan-meta">
                      {T.lekMeta(lek.aantal, lek.totaal)} <em>{lek.naam}</em>.
                    </p>
                    <ul className="scan-kosten">
                      {lek.vragen.map((v) => (
                        <li key={v.id}>{v.kost}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </>
          )}

          {gemeten.length > 0 && (
            <div className="scan-gemeten">
              <h3>{T.gemetenKop}</h3>
              {gemeten.map((m) => (
                <div className="scan-gemeten-rij" key={m.vraag.id}>
                  <p className="scan-gemeten-getal">
                    {m.meting.label}: <strong>{m.waarde} {m.meting.eenheid}</strong>
                  </p>
                  {m.meting.grens && (
                    <p className="scan-gemeten-duiding">
                      {m.meting.grens.duiding}{" "}
                      <span className="scan-gemeten-bron">{m.meting.grens.bron}</span>
                    </p>
                  )}
                </div>
              ))}
              <p className="scan-gemeten-slot">{T.gemetenSlot}</p>
            </div>
          )}

          <div className="scan-grens">
            <h3>{T.grensKop}</h3>
            <p>{T.grensP}</p>
          </div>

          <div className="scan-bewaar">
            <h3>{T.bewaarKop}</h3>
            <p>{T.bewaarP1}</p>
            {opvang.reeks && <div className="nl-msg ok">{T.reeksBevestigd}</div>}
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
            >
              {T.knopPrint}
            </button>
          </div>

          <div className="scan-cta">
            <p>{T.ctaP}</p>
            <LocaleLink href="/contact?interest=lekkage-scan" className="btn primary">
              {t("cta.book")}
            </LocaleLink>
            {/* De directe route staat er bewust naast: wie liever mailt dan
                een formulier invult, moet dat kunnen zonder te zoeken. */}
            <p className="scan-cta-direct">
              {T.liever} <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
