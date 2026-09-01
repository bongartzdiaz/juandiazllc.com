import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "./seo/branding";
import { zonderCommentaar } from "./bronscan";

/* Gate: één contactadres, één bron.
 *
 * Op 2026-09-01 ging het zichtbare contactadres om. Het stond op
 * drieëndertig plekken: zestien in `dict.ts`, drie op `/contact`, en de rest
 * verspreid over het JSON-LD `contactPoint`, `/llms.txt`, het commandopalet,
 * twee formulieren en de foutgrens. Een zoek-en-vervang had dat vandaag
 * opgelost en morgen dezelfde drift teruggegeven — precies de klasse waar dit
 * logboek het vaakst op terugkomt.
 *
 * `lib/contactadressen.test.ts` bewaakt het DOMEIN en kan dit niet zien: die
 * eist dat elk adres op juandiazllc.com staat, en `info@` en `juan@` staan daar
 * allebei op. Zestien plekken konden dus stil uiteenlopen zonder één rood
 * vinkje. Deze poort bewaakt het LOKALE DEEL en is daarmee de aanvulling, niet
 * de vervanger.
 *
 * WAAROM TWEE BESTANDEN DE LITERAL HOUDEN, en dat geen slordigheid is:
 *
 *   `lib/i18n/dict.ts`     `branding.ts` haalt zijn `Locale`-type daar vandaan.
 *                          Een waarde-import terug is een echte runtime-cyclus,
 *                          niet een type-import die bij het compileren verdwijnt.
 *   `app/global-error.tsx` de kop van dat bestand eist minimale afhankelijkheden.
 *                          Het is de grens die rendert als de rest stuk is, en
 *                          een import erbij is een import die dán kan falen.
 *
 * Die twee dragen het adres dus letterlijk, en de derde test hieronder pint ze
 * vast aan `CONTACT_EMAIL` met een verwacht aantal. Zonder dat aantal is de
 * pinning vacuüm: een bestand dat zijn adres kwijtraakt zou dan slagen.
 *
 * TEKSTSCAN EN GEEN MODULE-IMPORT, om dezelfde reden. Een import ziet de waarde
 * die `branding.ts` exporteert en per definitie niet de literals ernaast; het
 * defect zat juist in die literals. De scan gaat door `zonderCommentaar`, want
 * vier eerdere tekstscans in deze repo vielen om op hun eigen toelichting. Dat
 * die strip dragend is, is met een mutatiepaar bewezen en niet aangenomen.
 *
 * WAT DEZE POORT NIET ZIET. Markdown (`docs/`, `_drafts/`) valt buiten het
 * bereik: `_drafts/outreach/tier1-pitches-2026-07.md` noemt het oude adres als
 * AFZENDER-identiteit ("Verstuurd vanaf …, persoonlijk, geen nieuwsbrief-tool"),
 * en dat omzetten zou het punt van die zin slopen. Afzender en contactadres zijn
 * twee verschillende dingen die toevallig op één domein staan.
 */

const WORTEL = join(__dirname, "..");
const DOMEIN = "juandiazllc.com";

/** Elk `<lokaal>@juandiazllc.com` in de tekst, met het lokale deel apart. */
const ADRESSEN = new RegExp(`([a-zA-Z0-9._%+-]+)@${DOMEIN.replace(/\./g, "\\.")}`, "g");

/** Geleverde code: alles wat een bezoeker kan bereiken. Testbestanden niet —
 *  die beschrijven de regel en zijn er geen afnemer van. */
function geleverdeCode(): string[] {
  const uit: string[] = [];
  const loop = (dir: string) => {
    for (const naam of readdirSync(dir)) {
      const pad = join(dir, naam);
      if (statSync(pad).isDirectory()) {
        if (naam !== "node_modules") loop(pad);
      } else if (
        (naam.endsWith(".ts") || naam.endsWith(".tsx")) &&
        !naam.includes(".test.")
      ) {
        uit.push(pad);
      }
    }
  };
  for (const map of ["app", "components", "lib"]) loop(join(WORTEL, map));
  return uit;
}

const rel = (pad: string) => relative(WORTEL, pad).split(sep).join("/");

/** Uitzonderingen dragen een AANTAL en een REDEN, zodat een tweede voorkomen in
 *  hetzelfde bestand niet stil meelift. */
const UITZONDERINGEN: Record<string, { adres: string; aantal: number; reden: string }> = {
  "app/actions/newsletter.ts": {
    adres: "noreply@juandiazllc.com",
    aantal: 1,
    reden:
      "afzenderadres van een dode actie: hij schrijft naar `newsletter_subs`, " +
      "een tabel die in geen enkel schema bestaat. Een afzender is bovendien " +
      "iets anders dan een contactadres — antwoorden komt daar niet aan. De " +
      "vrijstelling draagt hieronder haar eigen voorwaarde: nul afnemers.",
  },
};

/** De twee bestanden die de literal moeten dragen, met het aantal erbij. */
const PINT_LITERAL: Record<string, { aantal: number; reden: string }> = {
  "lib/i18n/dict.ts": {
    aantal: 16,
    reden: "branding.ts haalt zijn Locale-type hier vandaan; import terug = cyclus",
  },
  "app/global-error.tsx": {
    aantal: 2,
    reden: "foutgrens, minimale afhankelijkheden per de kop van dat bestand",
  },
};

describe("contactadres", () => {
  it("is één waarde, op het eigen domein, en de mailto leidt eruit af", () => {
    expect(CONTACT_EMAIL).toMatch(/^[a-z0-9._%+-]+@juandiazllc\.com$/);
    expect(CONTACT_MAILTO).toBe(`mailto:${CONTACT_EMAIL}`);
  });

  it("de scanner vindt wat er staat, en niet wat er niet staat", () => {
    // Zonder deze controle is elke lege uitkomst hieronder ook te verklaren
    // door een regex die niets vindt.
    const treffers = [...`a info@${DOMEIN} b noreply@${DOMEIN} c`.matchAll(ADRESSEN)];
    expect(treffers.map((m) => m[0])).toEqual([`info@${DOMEIN}`, `noreply@${DOMEIN}`]);
    expect([...`iemand@example.com`.matchAll(ADRESSEN)]).toHaveLength(0);
  });

  it("de bestandswandeling ziet de bestanden die het adres werkelijk dragen", () => {
    const paden = geleverdeCode().map(rel);
    expect(paden.length).toBeGreaterThan(100);
    for (const pad of Object.keys(PINT_LITERAL)) expect(paden).toContain(pad);
    expect(paden).toContain("lib/seo/branding.ts");
    expect(paden.some((p) => p.includes(".test."))).toBe(false);
  });

  it("elk adres in geleverde code is CONTACT_EMAIL, op de vrijstellingen na", () => {
    const afwijkend: string[] = [];
    for (const pad of geleverdeCode()) {
      const naam = rel(pad);
      const bron = zonderCommentaar(readFileSync(pad, "utf8"));
      const gevonden = [...bron.matchAll(ADRESSEN)].map((m) => m[0]);
      const vrij = UITZONDERINGEN[naam];
      for (const adres of gevonden) {
        if (adres === CONTACT_EMAIL) continue;
        if (vrij && adres === vrij.adres) continue;
        afwijkend.push(`${naam}: ${adres}`);
      }
      if (vrij) {
        const n = gevonden.filter((a) => a === vrij.adres).length;
        expect(
          n,
          `${naam}: vrijstelling voor ${vrij.adres} verwacht ${vrij.aantal}x, gevonden ${n}x — ` +
            `klopt de reden nog? (${vrij.reden})`,
        ).toBe(vrij.aantal);
      }
    }
    expect(
      afwijkend,
      "adres in geleverde code dat niet CONTACT_EMAIL is; zet het om of geef het " +
        "een uitzondering met aantal en reden",
    ).toEqual([]);
  });

  it("de twee bestanden die de literal dragen, dragen precies CONTACT_EMAIL", () => {
    for (const [naam, { aantal, reden }] of Object.entries(PINT_LITERAL)) {
      const bron = zonderCommentaar(readFileSync(join(WORTEL, naam), "utf8"));
      const n = bron.split(CONTACT_EMAIL).length - 1;
      expect(n, `${naam} draagt CONTACT_EMAIL ${n}x, verwacht ${aantal} (${reden})`).toBe(
        aantal,
      );
    }
  });

  it("de vrijgestelde afzender staat in een bestand dat niemand importeert", () => {
    // De vrijstelling overleeft haar reden niet: krijgt `newsletter.ts` weer een
    // afnemer, dan is hij geen dode actie meer en valt deze poort om in plaats
    // van stil te blijven staan.
    const importeurs = geleverdeCode().filter((pad) => {
      if (rel(pad) === "app/actions/newsletter.ts") return false;
      const bron = zonderCommentaar(readFileSync(pad, "utf8"));
      return /from\s+["'][^"']*actions\/newsletter["']/.test(bron);
    });
    expect(importeurs.map(rel)).toEqual([]);
  });
});
