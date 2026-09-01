"use client";

/* De lekkage-scan. Vragen en scoremechanisme staan in lib/lekkage-scan.ts;
 * dit bestand is alleen opmaak en toestand.
 *
 * DRIE DINGEN DIE OPZET ZIJN, ZODAT NIEMAND ZE "REPAREERT":
 *
 * 1. Geen e-mailveld. docs/lead-magnet.md §4 zet de e-mail achter de
 *    PDF-variant, en die wacht op RESEND_API_KEY. Een veld dat vandaag een PDF
 *    belooft is precies de gebroken belofte waar §4 voor waarschuwt. De opvang
 *    loopt via de contactroute hieronder, en die is meetbaar: elke lead draagt
 *    `interest=lekkage-scan` in `source`.
 * 2. De kopij is hardgecodeerd Nederlands, niet via dict.ts. De pagina bestaat
 *    alleen op /nl (zie lib/i18n/enkele-taal.ts) — zelfde precedent als
 *    components/EnergyInsightLinks.tsx. Het knoplabel is de uitzondering: dat
 *    komt uit `cta.book`, omdat lib/i18n/eerste-stap.test.ts terecht eist dat
 *    elke ingang naar een gesprek overal dezelfde naam draagt.
 * 3. Bij nul lekken staat er dat er niets gevonden is. Een scan die altijd iets
 *    vindt is een verkoopinstrument en geen diagnose, en dit publiek merkt dat
 *    verschil binnen twee vragen.
 * 4. De twee invulvelden zijn OPTIONEEL en blokkeren de knop niet. Ze vragen om
 *    een getal uit de eigen administratie, niet om een schatting — en wie dat
 *    getal nu niet bij de hand heeft moet de scan gewoon kunnen afmaken. Een
 *    leeg veld levert dan ook niets op in de uitslag: geen nul, geen aanname. */

import { useEffect, useMemo, useRef, useState } from "react";
import { LocaleLink } from "@/components/LocaleLink";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/seo/branding";
import { useT } from "@/lib/i18n/useT";
import {
  AANTAL_WOORD,
  AANTAL_WOORD_HOOFD,
  BLOKKEN,
  VRAGEN,
  alleBeantwoord,
  duidMetingen,
  scoor,
  type Antwoorden,
  type Metingen,
} from "@/lib/lekkage-scan";

export function LekkageScan() {
  const t = useT();
  const [antwoorden, setAntwoorden] = useState<Antwoorden>({});
  const [metingen, setMetingen] = useState<Metingen>({});
  const [getoond, setGetoond] = useState(false);

  const compleet = alleBeantwoord(antwoorden);
  const lekken = useMemo(() => scoor(antwoorden), [antwoorden]);
  const gemeten = useMemo(() => duidMetingen(metingen), [metingen]);
  const open = VRAGEN.filter((v) => antwoorden[v.id] === undefined).length;

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
    setDatum(new Date().toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }));
    if (gemeld.current) return;
    gemeld.current = true;
    (window as unknown as {
      plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
    }).plausible?.("Scan Voltooid", { props: { lekken: String(lekken.length) } });
  }, [getoond, compleet, lekken.length]);

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
      {BLOKKEN.map((blok) => (
        <section className="scan-blok" key={blok.id}>
          <h2 className="scan-blok-naam">{blok.naam}</h2>
          {VRAGEN.filter((v) => v.blok === blok.id).map((v) => (
            <fieldset className="scan-vraag" key={v.id}>
              <legend>{v.vraag}</legend>
              <div className="scan-keuze">
                {[
                  { label: "Ja", waarde: true },
                  { label: "Nee", waarde: false },
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
                  <p className="scan-meting-uitleg">Optioneel. Sla over als je het nu niet kunt opzoeken.</p>
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
          Toon wat er lekt
        </button>
        <p className="scan-teller" aria-live="polite">
          {compleet
            ? `Alle ${VRAGEN.length} beantwoord.`
            : `Nog ${open} ${open === 1 ? "vraag" : "vragen"} te gaan.`}
        </p>
      </div>

      {getoond && compleet && (
        <section className="scan-uitslag" aria-live="polite">
          {/* Alleen op papier zichtbaar. Zonder deze kop draagt het vel geen
              datum en geen afzender, en dan is het over een maand een anoniem
              A4'tje dat niemand kan thuisbrengen. Staat in de DOM en niet in
              CSS-content, zodat het echte tekst blijft die je kunt selecteren
              en die een schermlezer kan bereiken. */}
          <div className="scan-printkop">
            <p className="scan-printkop-titel">Lekkage-scan{datum ? " · " + datum : ""}</p>
            <p className="scan-printkop-bron">
              juandiazllc.com/nl/tools/lekkage-scan · {CONTACT_EMAIL}
            </p>
          </div>

          {lekken.length === 0 ? (
            <>
              <h2>Deze scan ziet niets lekken.</h2>
              <p>
                Dat is een echte uitkomst en geen beleefdheid. {AANTAL_WOORD_HOOFD}{" "}
                ja/nee-vragen vinden de lekken die met overdracht, wachttijd, dubbele
                invoer en overlappende tools te maken hebben. Zitten die goed, dan zit
                je probleem ergens anders.
              </p>
            </>
          ) : (
            <>
              <h2>
                {lekken.length === 1
                  ? "Dit lekt bij jou het eerst"
                  : `Dit lekt bij jou het eerst — ${lekken.length} plekken, belangrijkste bovenaan`}
              </h2>
              <ol className="scan-lekken">
                {lekken.map((lek, i) => (
                  <li key={lek.blok}>
                    <h3>
                      <span className="scan-rang">{i + 1}</span> {lek.lek}
                    </h3>
                    <p className="scan-meta">
                      {lek.aantal} van de {lek.totaal} vragen onder <em>{lek.naam}</em>.
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
              <h3>Wat je zelf hebt gemeten</h3>
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
              <p className="scan-gemeten-slot">
                Dit zijn de enige getallen in deze scan die over jouw bedrijf gaan, en
                je hebt ze zelf opgezocht. Alles hierboven is een ja of een nee.
              </p>
            </div>
          )}

          <div className="scan-grens">
            <h3>Wat deze scan niet ziet</h3>
            <p>
              Geen marge per project, geen kwaliteit van de instroom, geen bezetting,
              en niets over of je mensen een nieuw systeem zouden gebruiken.{" "}
              {AANTAL_WOORD_HOOFD} ja/nee-vragen dragen hun eigen reikwijdte, en dit is
              hem.
            </p>
          </div>

          <div className="scan-bewaar">
            <h3>Neem deze uitslag mee</h3>
            <p>
              Eén pagina met jouw antwoorden erop. Geen e-mailadres, geen
              account, geen lijst waar je op komt — je bewaart hem zelf, en je
              kunt hem doorsturen naar wie er bij jou over gaat.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => window.print()}
            >
              Opslaan of printen
            </button>
          </div>

          <div className="scan-cta">
            <p>
              Wil je dit nagelopen hebben op je eigen cijfers in plaats van op{" "}
              {AANTAL_WOORD} vragen? Dat is het blueprint-gesprek: dertig minuten, en er
              komt een diagnose van één pagina uit.
            </p>
            <LocaleLink href="/contact?interest=lekkage-scan" className="btn primary">
              {t("cta.book")}
            </LocaleLink>
            {/* De directe route staat er bewust naast. Het formulier achter
                /contact schrijft op dit moment niets weg (Supabase 402), dus
                wie nu converteert krijgt een foutmelding. Mailen werkt altijd.
                Zie de operator-lijst in CLAUDE.md; deze regel mag weg zodra
                het datavlak weer schrijft. */}
            <p className="scan-cta-direct">
              Liever direct? <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
