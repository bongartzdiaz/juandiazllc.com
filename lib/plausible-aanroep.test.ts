import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zonderCommentaar } from "./bronscan";

/* ─────────────────────────────────────────────────────────────
   `window.plausible` mag nooit als functie worden aangenomen.

   Gemeten in de browser op productie, 2026-09-01. Het script droeg
   `id="plausible"`, en een element met een id wordt via HTML named access een
   eigenschap op window. Laadde het script niet -- een blokker, een DNS-filter,
   een storing -- dan was `window.plausible` niet undefined maar het
   HTMLScriptElement zelf: truthy, en niet aanroepbaar. De aanroep stond op
   `?.()`, en die vorm valt ALLEEN terug op null en undefined:

       nu            WERPT TypeError: p is not a function
       zonder het id undefined -- no-op, zoals bedoeld
       hersteld      object

   Beide aanroepen staan in een effect, dus die worp sloopt de React-boom in
   plaats van stil niets te meten. Bij `Contact Submitted` gebeurt dat direct
   na een GESLAAGDE inzending: het duurste moment op de site.

   Twee reparaties, en deze poort bewaakt ze allebei:
     A. het id claimt de naam niet meer  (`plausible-analytics`)
     B. elke aanroep staat achter een `typeof ... === "function"`

   B is de dragende helft. A alleen laat de val open voor het volgende id dat
   iemand toevallig `plausible` noemt, en dat is precies hoe hij is ontstaan.

   Daarom staat er naast de losse reparatie een controle op de KLASSE: geen
   letterlijk `id="..."` mag samenvallen met een naam die deze code van window
   leest. Dat dekt en passant `window.gtag` in `components/Toestemming.tsx`,
   dat dezelfde `?.()`-vorm draagt. Daar is het vandaag ongevaarlijk omdat
   onze eigen code `w.gtag` toekent vóór hij hem leest, en omdat geen element
   `id="gtag"` draagt -- die tweede helft is wat deze poort vasthoudt.

   LET OP: hij leest de bron ZONDER commentaar. De toelichting in
   `components/Analytics.tsx` draagt zowel `id="plausible"` als `.plausible(`
   woordelijk, want zonder die woorden valt niet uit te leggen wat er niet
   mag. Vier eerdere tekstscans in deze repo vielen om op hun eigen proza;
   test 2 hieronder bewijst op die echte bytes dat de strip hier draagt.
   ───────────────────────────────────────────────────────────── */

const WORTEL = join(__dirname, "..");

/** Mappen met geleverde code. Testbestanden tellen NIET mee: een aanroep in
    een test vuurt nergens een doel af, en zou hier anders als call-site
    gelden. Zelfde regel als in `lib/plausible-doelen.test.ts`. */
const MAPPEN = ["app", "components", "lib"];

function bronBestanden(map: string, uit: string[] = []): string[] {
  if (!existsSync(map)) return uit;
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam !== "node_modules") bronBestanden(pad, uit);
    } else if (/\.(ts|tsx)$/.test(naam) && !naam.includes(".test.")) {
      uit.push(pad);
    }
  }
  return uit;
}

const BRONNEN = MAPPEN.flatMap((m) => bronBestanden(join(WORTEL, m))).map((pad) => ({
  naam: relative(WORTEL, pad).split(sep).join("/"),
  ruw: readFileSync(pad, "utf8"),
  code: zonderCommentaar(readFileSync(pad, "utf8")),
}));

/** Elk bestand dat `window.plausible` in scriptvorm aanroept, met de reden.
    De lijst is er zodat een DERDE aanroeper een zichtbare bewerking kost --
    en niet stil buiten de typeof-controle om kan landen. */
const AANROEPERS: Record<string, string> = {
  "components/ContactForm.tsx": "Contact Submitted -- de conversie na een geslaagde inzending",
  "components/LekkageScan.tsx": "Scan Voltooid -- de afronding van de lekkage-scan",
};

/** Elke aanroep op een `.plausible`-lid, met of zonder optionele vorm. */
const AANROEP = /\.plausible(\?\.)?\s*\(/g;

/** Dezelfde aanroep, maar met een BENOEMDE ontvanger ervoor. Een aanroep op
    een uitdrukking (`(window as X).plausible(...)`) valt hier buiten, en dat
    is opzet: zonder naam is er niets om de typeof-controle op te ankeren. */
const MET_ONTVANGER = /([A-Za-z_$][A-Za-z0-9_$]*)\.plausible(\?\.)?\s*\(/g;

const AANROEPBESTANDEN = BRONNEN.filter((b) => {
  /* /g draagt lastIndex mee tussen aanroepen; zonder deze reset begint het
     volgende bestand halverwege en verdwijnt een aanroeper stil. */
  AANROEP.lastIndex = 0;
  return AANROEP.test(b.code);
});

describe("de aanroep van window.plausible", () => {
  it("vindt de aanroepplekken, en het zijn er precies deze", () => {
    /* Positieve controle. Zonder deze assertie slaagt alles hieronder ook op
       een lege lijst -- een scanner die niets vindt leest identiek aan een
       codebase die niets fout doet. */
    const gevonden = AANROEPBESTANDEN.map((b) => b.naam).sort();
    expect(gevonden.length, "de scanner vindt geen enkele aanroep -- kapot instrument").toBeGreaterThanOrEqual(2);
    expect(gevonden).toEqual(Object.keys(AANROEPERS).sort());
    for (const reden of Object.values(AANROEPERS)) {
      expect(reden.length, "elke aanroeper draagt een reden").toBeGreaterThan(20);
    }
  });

  it("leest de bron zonder commentaar, en dat is hier dragend", () => {
    /* Op echte bytes, niet op een synthetische string: de toelichting in
       Analytics.tsx draagt allebei de patronen die deze poort verbiedt. */
    const analytics = BRONNEN.find((b) => b.naam === "components/Analytics.tsx");
    expect(analytics, "components/Analytics.tsx is verdwenen").toBeTruthy();
    expect(analytics!.ruw).toContain('id="plausible"');
    expect(analytics!.ruw).toContain(".plausible(");
    expect(
      analytics!.code,
      "de commentaarstrip werkt niet -- deze poort valt dan om op zijn eigen uitleg",
    ).not.toContain('id="plausible"');
    expect(analytics!.code).not.toContain(".plausible(");
  });

  it("roept plausible nergens optioneel aan", () => {
    const fout: string[] = [];
    for (const b of BRONNEN) {
      if (/\.plausible\?\.\s*\(/.test(b.code)) fout.push(b.naam);
    }
    expect(
      fout,
      "`?.()` valt alleen terug op null en undefined; een truthy niet-functie werpt. " +
        "Gebruik `typeof x.plausible === \"function\"`.",
    ).toEqual([]);
  });

  it("zet voor elke aanroep een typeof-controle, en die staat ervoor", () => {
    for (const b of AANROEPBESTANDEN) {
      MET_ONTVANGER.lastIndex = 0;
      const treffers = [...b.code.matchAll(MET_ONTVANGER)];
      const totaal = [...b.code.matchAll(new RegExp(AANROEP.source, "g"))];
      expect(
        treffers.length,
        `${b.naam}: een aanroep zonder benoemde ontvanger -- er is dan niets om de ` +
          "typeof-controle op te ankeren. Zet window eerst in een const.",
      ).toBe(totaal.length);

      for (const t of treffers) {
        const ontvanger = t[1];
        const controle = new RegExp(`typeof\\s+${ontvanger}\\.plausible\\s*===\\s*["']function["']`);
        const m = controle.exec(b.code);
        expect(m, `${b.naam}: geen typeof-controle op ${ontvanger}.plausible`).toBeTruthy();
        expect(
          m!.index,
          `${b.naam}: de typeof-controle staat NA de aanroep en houdt dus niets tegen`,
        ).toBeLessThan(t.index!);
      }
    }
  });
});

/* ── de klasse: een id mag geen naam claimen die van window gelezen wordt ── */

/** Loopt vooruit vanaf `window as` en geeft terug wat er gecast wordt. Kan hij
    de vorm niet lezen, dan GOOIT hij -- een cast die deze poort niet begrijpt
    is een gat, en een gat hoort luid te zijn en niet stil overgeslagen. */
function castVorm(code: string, vanaf: number): { soort: "blok" | "naam" | "dynamisch"; tekst: string } {
  let i = vanaf;
  const rest = code.slice(i);
  const kop = /^window\s+as\s+(unknown\s+as\s+)?/.exec(rest);
  if (!kop) throw new Error(`onleesbare cast op index ${vanaf}: ${rest.slice(0, 60)}`);
  i += kop[0].length;
  if (code[i] === "{") {
    let diepte = 0;
    for (let j = i; j < code.length; j++) {
      if (code[j] === "{") diepte++;
      else if (code[j] === "}") {
        diepte--;
        if (diepte === 0) return { soort: "blok", tekst: code.slice(i + 1, j) };
      }
    }
    throw new Error(`ongebalanceerde cast-haken op index ${vanaf}`);
  }
  const naam = /^([A-Za-z_$][A-Za-z0-9_$]*)/.exec(code.slice(i));
  if (!naam) throw new Error(`onleesbare cast op index ${vanaf}: ${code.slice(i, i + 60)}`);
  if (naam[1] === "Record") return { soort: "dynamisch", tekst: naam[1] };
  return { soort: "naam", tekst: naam[1] };
}

/** Ledennamen op het BOVENSTE niveau van een typeblok. Genest gaat niet mee:
    `(...args: unknown[]) => void` en `{ props?: ... }` zijn geen eigenschappen
    van window. */
function ledenVanBlok(blok: string): string[] {
  const uit: string[] = [];
  let diepte = 0;
  const re = /[{}()<>]|([A-Za-z_$][A-Za-z0-9_$]*)\s*\??\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blok))) {
    if (m[0] === "{" || m[0] === "(" || m[0] === "<") diepte++;
    else if (m[0] === "}" || m[0] === ")" || m[0] === ">") diepte--;
    else if (m[1] && diepte === 0) uit.push(m[1]);
  }
  return uit;
}

/** Elke naam die deze code van window leest, met het bestand erbij. */
function vanWindowGelezen(): { naam: string; bestand: string }[] {
  const uit: { naam: string; bestand: string }[] = [];
  let dynamisch = 0;
  for (const b of BRONNEN) {
    for (const m of b.code.matchAll(/window\s+as\s+/g)) {
      const vorm = castVorm(b.code, m.index!);
      if (vorm.soort === "dynamisch") {
        dynamisch++;
        continue;
      }
      let blok = vorm.tekst;
      if (vorm.soort === "naam") {
        /* Benoemde cast: los het type in hetzelfde bestand op. Lukt dat niet,
           dan leest de poort minder dan hij belooft -- dus gooien. */
        const decl = new RegExp(
          `(?:type|interface)\\s+${vorm.tekst}\\b[^{]*\\{`,
        ).exec(b.code);
        if (!decl) {
          throw new Error(
            `${b.naam}: cast naar \`${vorm.tekst}\`, maar dat type staat niet in dit bestand. ` +
              "Breid de resolver uit; stil overslaan verzwakt deze poort.",
          );
        }
        const start = decl.index + decl[0].length - 1;
        const vorm2 = castVorm(`window as ${b.code.slice(start)}`, 0);
        blok = vorm2.tekst;
      }
      for (const naam of ledenVanBlok(blok)) uit.push({ naam, bestand: b.naam });
    }
  }
  /* Eén dynamische cast is bekend en verantwoord: de uitschakelaar van GA4
     schrijft `ga-disable-<id>`, een naam die geen element kan dragen. Een
     tweede is een keuze die iemand moet opschrijven. */
  if (dynamisch !== 1) {
    throw new Error(`${dynamisch} dynamische window-casts gevonden, 1 verwacht -- kijk ernaar`);
  }
  return uit;
}

/** Elk letterlijk `id="..."` in geleverde code. */
function idsInCode(): { id: string; bestand: string }[] {
  const uit: { id: string; bestand: string }[] = [];
  for (const b of BRONNEN) {
    for (const m of b.code.matchAll(/\bid="([^"]+)"/g)) uit.push({ id: m[1], bestand: b.naam });
  }
  return uit;
}

describe("HTML named access", () => {
  const GELEZEN = vanWindowGelezen();
  const IDS = idsInCode();

  it("leest werkelijk iets aan beide kanten", () => {
    /* Zonder deze twee is de lege doorsnede hieronder geen meting maar een
       stuk instrument. */
    expect(GELEZEN.map((g) => g.naam), "geen enkele window-cast gelezen").toContain("plausible");
    expect(IDS.length, "geen enkel id gelezen").toBeGreaterThan(20);
    expect(IDS.map((i) => i.id)).toContain("plausible-analytics");
  });

  it("laat geen id een naam claimen die van window gelezen wordt", () => {
    const namen = new Set(GELEZEN.map((g) => g.naam));
    const botsingen = IDS.filter((i) => namen.has(i.id)).map(
      (i) =>
        `${i.bestand}: id="${i.id}" botst met window.${i.id} ` +
        `(gelezen in ${GELEZEN.filter((g) => g.naam === i.id).map((g) => g.bestand).join(", ")})`,
    );
    expect(
      botsingen,
      "een element met dit id wordt via HTML named access die window-eigenschap, " +
        "en dan is de waarde het element in plaats van undefined. Hernoem het id.",
    ).toEqual([]);
  });

  it("herkent een botsing ook werkelijk", () => {
    /* De doorsnede-logica zelf, op een gebouwd geval -- anders is groen ook te
       verklaren door een vergelijking die nooit iets vindt. */
    const namen = new Set(["plausible", "gtag"]);
    const verzonnen = [{ id: "gtag", bestand: "verzonnen.tsx" }];
    expect(verzonnen.filter((i) => namen.has(i.id))).toHaveLength(1);
    expect([{ id: "gtag-loader", bestand: "verzonnen.tsx" }].filter((i) => namen.has(i.id))).toHaveLength(0);
  });
});
