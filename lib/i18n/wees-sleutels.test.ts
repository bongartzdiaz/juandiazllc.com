import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DICT } from "./dict";

/* Gate: elke sleutel in het woordenboek heeft een afnemer.
 *
 * Op 2026-08-20 droegen 56 sleutels x 4 talen kopij voor code die hier niet
 * meer staat. Negentien `dash.*` beschreven `/dashboard` (weg met #134), twintig
 * `app.*` de operator-hub (ook #134), vier `cookie.*` een banner die verdween
 * toen Plausible cookieloos werd, zes `contact.*` de formuliervelden van vóór
 * de meerstapsversie, en `nav.login` een inlog die met #138 vertrok.
 *
 * Dood gewicht in een woordenboek is niet neutraal. `cookie.body` beloofde in
 * vier talen "a session cookie for sign-in", en die sessie bestaat niet meer;
 * `dash.footer` noemde een subdomein dat niet in DNS staat. Zulke regels blijven
 * meelezen als bron van waarheid, ook als niets ze rendert.
 *
 * WAT DEZE POORT WEL EN NIET ZIET.
 *
 * Een sleutel wordt op twee manieren opgevraagd: letterlijk — `t("nav.about")` —
 * en samengesteld — `t(`process.${i}.name`)`. Alleen op de eerste zoeken merkt
 * hele families ten onrechte als dood aan; deze repo heeft er 49 van de tweede
 * soort. Beide worden hieronder verzameld.
 *
 * Wat hij niet ziet: een sleutel die uit data komt in plaats van uit een
 * template (bijvoorbeeld een lijst sleutelnamen in een JSON-bestand). Zo'n
 * geval hoort in ZONDER_AFNEMER met een reden.
 *
 * LET OP DE TEKENKLASSE. De eerste versie gebruikte [a-zA-Z0-9._] en miste
 * daarmee vijf sleutels met een koppelteken ("tag.label.real-estate"). Dezelfde
 * klasse zat óók in de scan naar afnemers, dus de fout hief zichzelf op: geen
 * vals alarm, geen ontbrekende melding, alleen vijf sleutels die stil buiten de
 * controle vielen. Zichtbaar werd het pas door het aantal te vergelijken met de
 * pariteitscontrole — 709 tegen 714. Vandaar de telling in de eerste test
 * hieronder: die vergelijkt de extractie met het woordenboek zelf. */

// Het koppelteken staat achteraan elke tekenklasse hieronder; ervóór opent het
// een bereik en is de regex ongeldig ("._-$" gooit "Range out of order").
const TEKENS = "a-zA-Z0-9._";
const WORTEL = join(__dirname, "..", "..");
const MAPPEN = ["app", "components", "lib", "scripts"];
const DICT_PAD = join(WORTEL, "lib", "i18n", "dict.ts");

/** Sleutels die bewust blijven staan, met reden. Leeg is het doel. */
const ZONDER_AFNEMER: Record<string, string> = {};

function bestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules" || naam === ".next") continue;
      uit.push(...bestanden(pad));
    } else if (/\.(tsx?|mjs)$/.test(naam) && !/\.test\.tsx?$/.test(naam)) {
      // Testbestanden tellen niet mee als afnemer. Een sleutel die alleen nog
      // in een test voorkomt, rendert nergens — die is dood, niet levend.
      //
      // Dit is geen theorie: de eerste versie van deze poort noemde `nav.login`
      // in haar eigen toelichting hierboven, en verklaarde die sleutel daarmee
      // springlevend. De mutatietest zette hem terug in alle vier de talen en
      // de poort bleef groen. Een controle die zichzelf als bewijs accepteert
      // is geen controle.
      uit.push(pad);
    }
  }
  return uit;
}

const BRONNEN = MAPPEN.flatMap((m) => bestanden(join(WORTEL, m)))
  .filter((p) => p !== DICT_PAD)
  .map((p) => relative(WORTEL, p).split(sep).join("/"));

const BRON = BRONNEN.map((p) => readFileSync(join(WORTEL, p), "utf8")).join("\n");

/** `t(`process.${i}.name`)` -> /^process\.[^.]+\.name$/ */
const PATRONEN = [
  ...BRON.matchAll(new RegExp("`([" + TEKENS + "-]*\\$\\{[^}]+\\}[" + TEKENS + "${}-]*)`", "g")),
]
  .map((m) => m[1])
  .filter((p) => p.includes("."))
  .map((p) => new RegExp("^" + p.replace(/[.]/g, "\\.").replace(/\$\{[^}]+\}/g, "[^.]+") + "$"));

const LETTERLIJK = new Set(
  [...BRON.matchAll(new RegExp("[\"'`]([" + TEKENS + "-]+)[\"'`]", "g"))].map((m) => m[1]),
);

const SLEUTELS = Object.keys(DICT.en);

describe("de meetlat zelf", () => {
  it("leest de bronbestanden werkelijk", () => {
    // Zonder deze controle zou een kapot pad de hele poort op een lege
    // brontekst laten slagen — en dan is élke sleutel plotseling een wees,
    // of juist geen enkele.
    expect(BRONNEN.length).toBeGreaterThan(60);
    expect(BRON.length).toBeGreaterThan(200_000);
  });

  it("herkent samengestelde sleutels", () => {
    expect(PATRONEN.length).toBeGreaterThan(20);
  });

  it("elke taal draagt exact dezelfde sleutels", () => {
    // Op het draaiende woordenboek, niet op de brontekst. scripts/check-i18n-
    // parity.mjs leest het bestand als tekst en telde daardoor vijftien
    // sleutels te weinig: de vijf procesfases staan met vier sleutels op één
    // regel, en zijn regex las alleen de eerste per regel. Die is meegefixt,
    // maar een tekstscanner blijft een benadering — Object.keys is het echte
    // antwoord.
    expect(SLEUTELS.length).toBeGreaterThan(500);
    const en = new Set(SLEUTELS);
    for (const l of ["nl", "de", "es"] as const) {
      const mist = SLEUTELS.filter((k) => !(k in DICT[l]));
      const teveel = Object.keys(DICT[l]).filter((k) => !en.has(k));
      expect(mist, `${l} mist sleutels die en wel heeft`).toEqual([]);
      expect(teveel, `${l} heeft sleutels die en niet heeft`).toEqual([]);
    }
  });

  it("ziet een sleutel die letterlijk in de bron staat", () => {
    // Tegenproef: als de scan stuk is, is deze bekende sleutel ook onvindbaar.
    expect(LETTERLIJK.has("nav.about")).toBe(true);
  });
});

describe("geen sleutel zonder afnemer", () => {
  it("elke sleutel wordt ergens opgevraagd", () => {
    const wees = SLEUTELS.filter(
      (k) => !(k in ZONDER_AFNEMER) && !LETTERLIJK.has(k) && !PATRONEN.some((re) => re.test(k)),
    );
    expect(
      wees,
      "deze sleutels vertalen kopij die niemand rendert — verwijder ze, of zet ze met reden in ZONDER_AFNEMER",
    ).toEqual([]);
  });

  it("de uitzonderingenlijst bevat geen sleutels die inmiddels wél gebruikt worden", () => {
    // Anders groeit de lijst stil door met sleutels die er niet meer op horen.
    for (const k of Object.keys(ZONDER_AFNEMER)) {
      expect(
        LETTERLIJK.has(k) || PATRONEN.some((re) => re.test(k)),
        `${k} staat in ZONDER_AFNEMER maar heeft nu een afnemer — haal hem eruit`,
      ).toBe(false);
    }
  });

  it("de uitzonderingenlijst noemt alleen bestaande sleutels", () => {
    for (const k of Object.keys(ZONDER_AFNEMER)) {
      expect(DICT.en[k], `${k} staat in ZONDER_AFNEMER maar niet in het woordenboek`).toBeDefined();
    }
  });
});
