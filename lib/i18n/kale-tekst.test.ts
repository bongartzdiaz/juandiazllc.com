import { describe, it, expect } from "vitest";
import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { ENKELE_TAAL } from "./enkele-taal";
import { zonderCommentaar } from "../bronscan";

/* Gate: geen letterlijke gebruikerstekst in JSX.
 *
 * Op 2026-08-24 droeg `app/[locale]/sectors/[slug]/page.tsx` zestien
 * tekstknopen met Engels erin — koppen, lede's en drie CTA's — en die stonden
 * woordelijk hetzelfde op /nl, /de en /es. Vier sectorpagina's maal vier talen,
 * allemaal in de sitemap, allemaal met hreflang naar elkaar.
 *
 * Vijf i18n-poorten keken eroverheen. `metadata-locales` leest `generateMetadata`,
 * `wees-sleutels` en `duits`/`nederlands` lezen `DICT`, en `check-i18n-parity`
 * vergelijkt de woordenboeken onderling. Alle vijf gaan over sleutels. Een zin
 * die nooit een sleutel kreeg heeft niets om uit de pas mee te lopen — hij is
 * per constructie in evenwicht met zichzelf.
 *
 * WAAROM DIT PARSET EN NIET GREPT.
 *
 * De eerste versie was een regex op `>tekst<`. Die gaf 339 treffers waarvan de
 * meeste JS waren: `useRef<X>(null)`, pijlfuncties en vergelijkingen dragen
 * allemaal < en >. Een regex kan TSX niet lezen. `ts.SyntaxKind.JsxText` is het
 * exacte knooptype en geeft 86.
 *
 * Dat sluit meteen de klasse die deze repo deze maand vier keer raakte: een
 * tekstscan die op zijn eigen toelichting valt (`contactadressen`,
 * `persoon-entiteit`, `verzoeklimiet`, `server-acties`). Een parser ziet een
 * comment niet als JSX-tekst, dus hier is geen commentaarstrip nodig — en dat
 * wordt hieronder bewezen in plaats van aangenomen.
 *
 * WAT HIJ NIET ZIET: een Engelse zin in `DICT.nl`, kopij die via een prop
 * binnenkomt, en `title=` / `placeholder=` / `aria-label=` — dat zijn attributen
 * en geen tekstknopen. Voor die laatste bestaat nog geen poort. */

const WORTEL = join(__dirname, "..", "..");
const MAPPEN = ["app", "components"];

/** Een woord: twee of meer letters, diakrieten meegerekend. */
const WOORD = /[A-Za-zÀ-ɏ]{2,}/g;

/** Alle JSX-tekstknopen in één bron die op gebruikerstekst lijken. */
export function kaleTekst(bron: string, pad = "x.tsx"): string[] {
  const boom = ts.createSourceFile(
    pad,
    bron,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const uit: string[] = [];
  const wandel = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.JsxText) {
      const tekst = n
        .getText()
        .replace(/&[a-z]+;|&#x?[0-9a-fA-F]+;/g, "'")
        .trim()
        .split(/\s+/)
        .join(" ");
      const woorden = tekst.match(WOORD);
      // Eén los kort woord is meestal leesteken-ruis rond een interpolatie.
      // Twee woorden, of één van vier letters, is een zin of een label.
      if (woorden && (woorden.length >= 2 || woorden.some((w) => w.length >= 4))) {
        uit.push(tekst);
      }
    }
    n.forEachChild(wandel);
  };
  wandel(boom);
  return uit;
}

function bestanden(dir: string): string[] {
  return readdirSync(dir).flatMap((naam) => {
    const pad = join(dir, naam);
    if (statSync(pad).isDirectory()) {
      return naam === "node_modules" ? [] : bestanden(pad);
    }
    return naam.endsWith(".tsx") && !naam.includes(".test.") ? [pad] : [];
  });
}

const BRONNEN = MAPPEN.flatMap((m) => bestanden(join(WORTEL, m)))
  .map((p) => relative(WORTEL, p).split(sep).join("/"))
  .sort();

/* Eigennamen: merk, domein, adres, persoon, platform. Die vertalen niet, en ze
 * staan in bijna elk bestand dat een kop of een voettekst draagt. EXACTE
 * gelijkheid, geen substring — anders glipt "Juan Diaz, LLC builds systems that
 * make operators more money" er als eigennaam doorheen. */
const IDENTITEIT = new Set([
  "Juan Diaz, LLC",
  "Juan Diaz, LLC / 2026",
  "Juan Diaz, LLC · Ventures",
  "juandiazllc.com",
  "juandiazllc.com ·",
  "info@juandiazllc.com",
  "juan",
  "Juan",
  "Juan Stefan Diaz",
  "— Juan Stefan Diaz",
  "— Juan Stefan Bongartz Diaz",
  "LinkedIn — /juanstefan",
  "Instagram — @diazelcazador",
  "WhatsApp",
]);

/* Structureel vrijgesteld, per bestand, met de reden erbij. Een verbod zonder
 * reden wordt over een jaar weggehaald door iemand die niet weet waarom het er
 * stond; een vrijstelling zonder reden blijft juist staan nadat de reden
 * verdween. Vandaar dat de vier redenen hieronder elk hun eigen assertie
 * hebben verderop in dit bestand. */
const TOEGESTAAN: Record<string, { reden: string; tekst: string[] }> = {
  "app/opengraph-image.tsx": {
    reden:
      "De wortelkaart is sinds 2026-08-26 niet meer de deelkaart van elke " +
      "taal: ogImages(l) wijst per taal naar app/[locale]/opengraph-image.tsx. " +
      "Wat hier overblijft is de entiteitsafbeelding waar AUTHOR_IMAGE_URL " +
      "naar wijst voor Person.image en Organization.image in de JSON-LD. Een " +
      "entiteit hoort een afbeelding te dragen — zie #198, dat vier losse " +
      "Person-knopen juist tot een terugbracht. Deze vrijstelling draagt haar " +
      "eigen voorwaarde in app/og-deelkaart.test.ts: zodra een pagina de kale " +
      "wortelkaart weer als og:image zet, of AUTHOR_IMAGE_URL er niet meer " +
      "naar wijst, valt die poort om.",
    tekst: [
      "I build the systems",
      "that make operators",
      "more money.",
      "Energy · Real Estate · Hospitality",
    ],
  },
  "app/global-error.tsx": {
    reden:
      "Root error boundary. Vervangt het hele document zodra de root-layout " +
      "zelf omvalt, dus buiten LocaleProvider en buiten elk [locale]-segment. " +
      "Een vertaling ophalen op het moment dat de app crasht is precies wat je " +
      "daar niet wilt.",
    tekst: [
      "◉ System error",
      "Something broke on our side.",
      "We have been notified automatically. Hit retry, or head back to the homepage — if this keeps happening, drop a line to",
      "Try again",
      "Go home",
    ],
  },
  "app/[locale]/tools/lekkage-scan/page.tsx": {
    reden: "Bestaat bewust alleen op /nl — zie ENKELE_TAAL.",
    tekst: [
      "Gratis · vier minuten · geen e-mail",
      "Waar lekt het bij jou?",
      "De omzet lekt zelden in de markt. Hij lekt tussen de tools — in de overdracht naar de buitendienst, in de dagen tussen aanvraag en offerte, in het adres dat voor de derde keer wordt overgetypt.",
      "vragen, en je weet welke drie bij jou het eerst lekken.",
    ],
  },
  "components/LekkageScan.tsx": {
    reden: "Rendert alleen op /nl/tools/lekkage-scan — zie ENKELE_TAAL.",
    tekst: [
      "Optioneel. Sla over als je het nu niet kunt opzoeken.",
      "Lekkage-scan",
      "juandiazllc.com/nl/tools/lekkage-scan ·",
      "Neem deze uitslag mee",
      "Eén pagina met jouw antwoorden erop. Geen e-mailadres, geen account, geen lijst waar je op komt — je bewaart hem zelf, en je kunt hem doorsturen naar wie er bij jou over gaat.",
      "Opslaan of printen",
      "Liever direct?",
      "Toon wat er lekt",
      "Deze scan ziet niets lekken.",
      "Dat is een echte uitkomst en geen beleefdheid.",
      "ja/nee-vragen vinden de lekken die met overdracht, wachttijd, dubbele invoer en overlappende tools te maken hebben. Zitten die goed, dan zit je probleem ergens anders.",
      "van de",
      "vragen onder",
      "Wat je zelf hebt gemeten",
      "Dit zijn de enige getallen in deze scan die over jouw bedrijf gaan, en je hebt ze zelf opgezocht. Alles hierboven is een ja of een nee.",
      "Wat deze scan niet ziet",
      "Geen marge per project, geen kwaliteit van de instroom, geen bezetting, en niets over of je mensen een nieuw systeem zouden gebruiken.",
      "ja/nee-vragen dragen hun eigen reikwijdte, en dit is hem.",
      "Wil je dit nagelopen hebben op je eigen cijfers in plaats van op",
      "vragen? Dat is het blueprint-gesprek: dertig minuten, en er komt een diagnose van één pagina uit.",
    ],
  },
  "components/ScanCallout.tsx": {
    reden: "Poortert zelf op ENKELE_TAAL en rendert dus alleen op /nl.",
    tekst: [
      "◉ Vier minuten",
      "ja/nee-vragen over je stack, en je ziet welke drie dingen bij jou het eerst lekken. Geen e-mail, geen verkooppraat — de uitslag staat meteen op je scherm.",
      "Doe de lekkage-scan",
    ],
  },
  "components/ContactForm.tsx": {
    reden:
      "Honeypot: staat in een div met aria-hidden=true en wordt door geen " +
      "bezoeker en geen schermlezer waargenomen. Het label bestaat alleen voor " +
      "de bot die het invult.",
    tekst: [
      "Website (leave blank)",
    ],
  },
  "components/NewsletterForm.tsx": {
    reden:
      "Honeypot, zelfde reden als ContactForm: aria-hidden en alleen bedoeld " +
      "voor de bot die het veld invult.",
    tekst: [
      "Website",
    ],
  },
  "components/sections/Testimonials.tsx": {
    reden:
      "TESTIMONIALS is bewust leeg tot er goedgekeurde quotes zijn, en het " +
      "component keert bij een lege lijst met null terug. Deze drie zinnen " +
      "renderen vandaag nergens.",
    tekst: [
      "◉ Proof in production",
      "Operators who stopped",
      "leaking revenue",
    ],
  },
  "components/sections/Story.tsx": {
    reden:
      "Geen kale kopij maar een splitsing ván vertaalde kopij: " +
      "t('story.lead.b').split('blueprint') zet <em> om het woord heen. De zin " +
      "komt uit het woordenboek, alleen het splitswoord staat in de markup.",
    tekst: [
      "blueprint",
    ],
  },
};

/* Gemeten en niet gerepareerd. Deze lijst mag krimpen en niet groeien.
 *
 * Het alternatief was ze in TOEGESTAAN zetten, en dat is precies hoe "alleen op
 * de homepage" bij ResultsStrip een besluit werd dat niemand ooit nam: het was
 * de plek waar het blok geboren werd en daarna keek er niemand meer naar. Een
 * achterstand met een teller erop blijft zichtbaar. */
const ACHTERSTAND: Record<string, { reden: string; tekst: string[] }> = {};

/* Het cijfer waar de ratel op staat. Verlagen mag altijd; verhogen betekent dat
 * er een lek bij is gekomen, en dan hoort deze regel zichtbaar in de diff. */
const ACHTERSTAND_MAX = 0;

function verzameld(lijst: typeof TOEGESTAAN): Map<string, Set<string>> {
  return new Map(
    Object.entries(lijst).map(([pad, v]) => [pad, new Set(v.tekst)]),
  );
}

const OK = verzameld(TOEGESTAAN);
const NOG = verzameld(ACHTERSTAND);

/* Attributen die kopij dragen. De rest van de props is technisch: gemeten over
 * app/ en components/ leverde de volle attribuutscan 53 treffers waarvan 16
 * aria-hidden="true", acht aria-labelledby en zeven htmlFor -- allemaal
 * verwijzingen en vlaggen, geen tekst. Deze vier dragen wat een bezoeker of
 * een schermlezer werkelijk te horen krijgt. */
const KOPIJ_ATTRIBUTEN = new Set(["aria-label", "placeholder", "title", "alt"]);

/** Kopij die als prop binnenkomt, als `naam=waarde`. */
export function kaleAttributen(bron: string, pad = "x.tsx"): string[] {
  const boom = ts.createSourceFile(
    pad,
    bron,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const uit: string[] = [];
  const wandel = (n: ts.Node) => {
    if (ts.isJsxAttribute(n) && n.initializer) {
      const naam = n.name.getText();
      if (KOPIJ_ATTRIBUTEN.has(naam)) {
        const init = n.initializer;
        let waarde: string | null = null;
        if (ts.isStringLiteral(init)) {
          waarde = init.text;
        } else if (ts.isJsxExpression(init) && init.expression) {
          const e = init.expression;
          // Alleen letterlijke waarden. Komt de waarde uit translate(l, ...)
          // of uit een variabele, dan is er niets letterlijks te vinden en
          // hoort deze poort er ook niets over te zeggen.
          if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
            waarde = e.text;
          } else if (ts.isTemplateExpression(e)) {
            waarde =
              e.head.text + e.templateSpans.map((sp) => sp.literal.text).join(" ");
          }
        }
        if (waarde) {
          const schoon = waarde.trim().split(/\s+/).join(" ");
          const woorden = schoon.match(WOORD);
          if (
            woorden &&
            (woorden.length >= 2 || woorden.some((w) => w.length >= 4)) &&
            !IDENTITEIT.has(schoon)
          ) {
            uit.push(`${naam}=${schoon}`);
          }
        }
      }
    }
    n.forEachChild(wandel);
  };
  wandel(boom);
  return uit;
}

/* Kopij-als-prop, structureel vrijgesteld. */
const ATTR_TOEGESTAAN: Record<string, { reden: string; tekst: string[] }> = {
  "app/layout.tsx": {
    reden:
      "Titels van de twee feed-links in <head>. Een feed draagt de merknaam, " +
      "niet de taal van de bezoeker, en beide feeds serveren Engelse artikelen.",
    tekst: [
      "title=Juan Diaz, LLC — Insights",
      "title=Juan Diaz, LLC — Insights",
    ],
  },
  "components/ContactForm.tsx": {
    reden:
      "Vormvoorbeeld, geen zin: het laat zien hoe een adres eruitziet en " +
      "leest in elke taal hetzelfde.",
    tekst: ["placeholder=you@domain.com"],
  },
  "components/NewsletterForm.tsx": {
    reden:
      "Zelfde vormvoorbeeld als in ContactForm: het toont de vorm van een " +
      "adres en leest in elke taal hetzelfde.",
    tekst: ["placeholder=you@domain.com"],
  },
  "components/ScanCallout.tsx": {
    reden: "Rendert alleen op /nl, dus Nederlands is hier de keuze -- ENKELE_TAAL.",
    tekst: ["aria-label=Lekkage-scan"],
  },
};

/* Kopij-als-prop, gemeten en niet gerepareerd. */
const ATTR_ACHTERSTAND: Record<string, { reden: string; tekst: string[] }> = {
};

const ATTR_OK = verzameld(ATTR_TOEGESTAAN);
const ATTR_NOG = verzameld(ATTR_ACHTERSTAND);

describe("de scanner zelf", () => {
  it("vindt een letterlijke zin in JSX", () => {
    const bron = "export const A = () => <p>Where revenue leaks in this sector.</p>;";
    expect(kaleTekst(bron)).toEqual(["Where revenue leaks in this sector."]);
  });

  it("ziet dezelfde zin in een comment NIET als tekst", () => {
    // Dit is de assertie die de vier tekstscans van deze maand hadden moeten
    // hebben. Zonder haar is "geen treffers" in een vrijgesteld bestand niet te
    // onderscheiden van een instrument dat niets kán vinden.
    const bron =
      "// Where revenue leaks in this sector.\n" +
      "/* Where revenue leaks in this sector. */\n" +
      "export const A = () => <p>{t('x')}</p>;";
    expect(kaleTekst(bron)).toEqual([]);
  });

  it("laat losse leestekens en korte fragmenten met rust", () => {
    expect(kaleTekst("export const A = () => <p>— {x} · {y}</p>;")).toEqual([]);
  });

  it("scant een niet-leeg aantal bestanden", () => {
    expect(BRONNEN.length).toBeGreaterThan(50);
  });
});

describe("geen kale gebruikerstekst in JSX", () => {
  it("elke treffer staat op IDENTITEIT, TOEGESTAAN of ACHTERSTAND", () => {
    const onbekend: string[] = [];
    for (const pad of BRONNEN) {
      for (const tekst of kaleTekst(readFileSync(join(WORTEL, pad), "utf8"), pad)) {
        if (IDENTITEIT.has(tekst)) continue;
        if (OK.get(pad)?.has(tekst)) continue;
        if (NOG.get(pad)?.has(tekst)) continue;
        onbekend.push(`${pad}: ${tekst}`);
      }
      for (const attr of kaleAttributen(readFileSync(join(WORTEL, pad), "utf8"), pad)) {
        if (ATTR_OK.get(pad)?.has(attr)) continue;
        if (ATTR_NOG.get(pad)?.has(attr)) continue;
        onbekend.push(`${pad}: ${attr}`);
      }
    }
    expect(onbekend).toEqual([]);
  });

  it("de sectorpagina draagt er geen meer", () => {
    const pad = "app/[locale]/sectors/[slug]/page.tsx";
    expect(kaleTekst(readFileSync(join(WORTEL, pad), "utf8"), pad)).toEqual([]);
  });

  it("geen dode regel: elke vrijstelling komt nog werkelijk voor", () => {
    const dood: string[] = [];
    for (const [lijst, naam] of [
      [TOEGESTAAN, "TOEGESTAAN"],
      [ACHTERSTAND, "ACHTERSTAND"],
      [ATTR_TOEGESTAAN, "ATTR_TOEGESTAAN"],
      [ATTR_ACHTERSTAND, "ATTR_ACHTERSTAND"],
    ] as const) {
      for (const [pad, v] of Object.entries(lijst)) {
        const bron = readFileSync(join(WORTEL, pad), "utf8");
        const gevonden = new Set(
          naam.startsWith("ATTR_")
            ? kaleAttributen(bron, pad)
            : kaleTekst(bron, pad),
        );
        for (const t of v.tekst) {
          if (!gevonden.has(t)) dood.push(`${naam} ${pad}: ${t}`);
        }
      }
    }
    expect(dood).toEqual([]);
  });

  it("de achterstand groeit niet", () => {
    const totaal = [
      ...Object.values(ACHTERSTAND),
      ...Object.values(ATTR_ACHTERSTAND),
    ].reduce((n, v) => n + v.tekst.length, 0);
    expect(totaal).toBeLessThanOrEqual(ACHTERSTAND_MAX);
  });

  it("elke vrijstelling en elke achterstandsregel draagt een reden", () => {
    for (const lijst of [
      TOEGESTAAN,
      ACHTERSTAND,
      ATTR_TOEGESTAAN,
      ATTR_ACHTERSTAND,
    ]) {
      for (const [pad, v] of Object.entries(lijst)) {
        expect(v.reden.length, pad).toBeGreaterThan(40);
        expect(v.tekst.length, pad).toBeGreaterThan(0);
      }
    }
  });
});

describe("de vrijstellingen dragen hun eigen voorwaarde", () => {
  it("lekkage-scan staat werkelijk in ENKELE_TAAL", () => {
    // Valt die route ooit terug naar vier talen, dan is Nederlands in die drie
    // bestanden geen keuze meer maar een lek — en vervalt de vrijstelling.
    expect(Object.keys(ENKELE_TAAL)).toContain("/tools/lekkage-scan");
  });

  it("Testimonials rendert nog steeds niets", () => {
    const bron = readFileSync(
      join(WORTEL, "components/sections/Testimonials.tsx"),
      "utf8",
    );
    expect(bron).toContain("if (TESTIMONIALS.length === 0) return null;");
    const lijst = zonderCommentaar(bron).match(
      /const TESTIMONIALS: Testimonial\[\] = \[([\s\S]*?)\];/,
    );
    expect(lijst?.[1].trim()).toBe("");
  });

  it("de twee honeypots staan nog achter aria-hidden", () => {
    for (const pad of ["components/ContactForm.tsx", "components/NewsletterForm.tsx"]) {
      const bron = readFileSync(join(WORTEL, pad), "utf8");
      expect(bron, pad).toContain('<div className="hp-field" aria-hidden="true">');
    }
  });

  it("global-error valt nog buiten LocaleProvider", () => {
    // Een global-error die de provider zou importeren kan hem ook gebruiken,
    // en dan is Engels daar een keuze in plaats van een gegeven.
    const bron = readFileSync(join(WORTEL, "app/global-error.tsx"), "utf8");
    expect(zonderCommentaar(bron)).not.toContain("LocaleProvider");
  });
});
