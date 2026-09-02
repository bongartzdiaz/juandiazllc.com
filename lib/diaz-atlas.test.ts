/**
 * Poort op `docs/diaz-atlas-volgorde.md`.
 *
 * Dat document leunt op cijfers die in `docs/claims.md` gemeten zijn. Deze
 * poort **parseert** ze daaruit en legt ze tegen het document; hij typt niets
 * over. Een tweede kopie van een getal is precies de bugklasse waarvoor
 * `claims.md` bestaat.
 *
 * Elke parser gooit als zijn rij ontbreekt of meer dan een keer voorkomt. Een
 * parser die de eerste treffer pakt en over de rest zwijgt, publiceert stil de
 * verkeerde waarde zodra er een tweede rij bij komt — dat is hier eerder
 * gebeurd (#229) en het klopte toen alleen bij toeval.
 *
 * WAT DEZE POORT NIET KAN ZIEN. Of `claims.md` zelf nog klopt. Het
 * Supabase-datavlak stond op 2026-09-02 op 402 en er is van hieruit geen
 * Stripe-toegang, dus de rijen over licenties, betalingen en downloads dragen
 * de datum van hun eigen meting. Groen betekent hier: het document klopt met
 * het register. Niet: het register klopt met de wereld.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const WORTEL = join(__dirname, "..");
const VOLGORDE = join(WORTEL, "docs", "diaz-atlas-volgorde.md");
const CLAIMS = join(WORTEL, "docs", "claims.md");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

const DOC = lees(VOLGORDE);
const REGISTER = lees(CLAIMS);

/** De kop van de sectie die dit document als bron gebruikt. */
const SECTIEKOP =
  "## Diaz Atlas — de trechter, de installer en de betaalketen (gemeten 2026-09-02)";

/**
 * Precies een treffer, of gooi met wat er moet gebeuren. `matchAll` en niet
 * `match`: zonder de globale vlag pak je stil de eerste van meerdere rijen.
 */
function eenTreffer(bron: string, patroon: RegExp, wat: string): string {
  const alle = [...bron.matchAll(patroon)];
  if (alle.length !== 1) {
    throw new Error(
      `docs/claims.md draagt ${alle.length} rijen voor \`${wat}\`, verwacht 1. ` +
        "Zet de rij terug of werk deze poort bij — een cijfer zonder eenduidige " +
        "bron mag nergens in een document staan.",
    );
  }
  return alle[0][1].trim();
}

/** De vier tier-bedragen uit de prijstabel. Dit is de enige toegestane set. */
function prijzenUitClaims(): Set<string> {
  const alle = [
    ...REGISTER.matchAll(/\|[^|\n]*tier[^|\n]*\|\s*€([\d.,]+), one-time\s*\|/g),
  ];
  if (alle.length < 4) {
    throw new Error(
      `docs/claims.md levert ${alle.length} tier-bedragen, verwacht minstens 4. ` +
        "De prijstabel is hernoemd of de parser is stuk.",
    );
  }
  return new Set(alle.map((m) => normaliseer(m[1])));
}

/** Scheidingstekens weg, zodat 1.500 en 1,500 hetzelfde bedrag zijn. */
function normaliseer(bedrag: string): string {
  return bedrag.replace(/[.,]/g, "");
}

function checkoutSessiesUitClaims(): number {
  return Number(
    eenTreffer(REGISTER, /\|\s*Checkout-sessies\s*\|\s*\*\*(\d+),/g, "Checkout-sessies"),
  );
}

function downloadsUitClaims(): number {
  return Number(
    eenTreffer(REGISTER, /\|\s*Downloads\s*\|\s*\*\*~(\d+)\*\*/g, "Downloads"),
  );
}

describe("docs/claims.md draagt de bron", () => {
  it("heeft de Diaz-Atlas-sectie precies een keer", () => {
    const n = REGISTER.split(SECTIEKOP).length - 1;
    expect(n, `sectiekop komt ${n}x voor in docs/claims.md`).toBe(1);
  });

  it("levert de vier tier-bedragen op", () => {
    const prijzen = prijzenUitClaims();
    // Positieve controle: zonder deze twee slaagt elke bedragcontrole hieronder
    // ook op een lege set, en dan meet hij niets.
    expect(prijzen.has("197")).toBe(true);
    expect(prijzen.has("247")).toBe(true);
  });

  it("levert de twee cijfers op die het document herhaalt", () => {
    expect(checkoutSessiesUitClaims()).toBeGreaterThan(0);
    expect(downloadsUitClaims()).toBeGreaterThan(0);
  });

  it("gooit op een rij die niet bestaat, in plaats van leeg terug te geven", () => {
    expect(() =>
      eenTreffer(REGISTER, /\|\s*Verzonnen-rij\s*\|\s*\*\*(\d+)\*\*/g, "Verzonnen-rij"),
    ).toThrow(/verwacht 1/);
  });
});

describe("docs/diaz-atlas-volgorde.md klopt met het register", () => {
  it("noemt claims.md als bron", () => {
    expect(DOC).toContain("docs/claims.md");
  });

  it("draagt geen bedrag dat niet in de prijstabel staat", () => {
    const prijzen = prijzenUitClaims();
    const gevonden = [...DOC.matchAll(/€([\d.,]*\d)/g)].map((m) => m[1]);
    expect(gevonden.length, "geen enkel bedrag gevonden — is de scan stuk?").toBeGreaterThan(0);
    const vreemd = gevonden.filter((b) => !prijzen.has(normaliseer(b)));
    expect(
      vreemd,
      `bedrag(en) die niet uit de prijstabel van docs/claims.md komen: ${vreemd.join(", ")}`,
    ).toEqual([]);
  });

  it("herhaalt het aantal checkout-sessies zoals het register het meet", () => {
    expect(DOC).toContain(`${checkoutSessiesUitClaims()} checkout-sessies`);
  });

  it("herhaalt het aantal downloads zoals het register het meet", () => {
    expect(DOC).toContain(`~${downloadsUitClaims()} downloads`);
  });
});

describe("de volgorde zelf", () => {
  const STAPPEN = DOC.split(/^## \d+\. /m).slice(1);

  it("telt vier genummerde stappen", () => {
    expect(STAPPEN).toHaveLength(4);
  });

  it("geeft elke stap een blokkade en een afsluitvoorwaarde", () => {
    // Zonder deze twee is het geen volgorde maar een verlanglijst: dan staat
    // er niet bij waarom een stap wacht, en niet waaraan je ziet dat hij klaar is.
    const zonder = STAPPEN.filter(
      (s) => !s.includes("**Blokkade:**") || !s.includes("**Wat het afsluit:**"),
    ).map((s) => s.split("\n")[0]);
    expect(zonder, `stap(pen) zonder blokkade of afsluitvoorwaarde: ${zonder.join(" | ")}`).toEqual(
      [],
    );
  });
});

describe("de EV-bewering blijft als bewering gelabeld", () => {
  // electron-builder.yml zegt met bronvermelding dat EV sinds 2024 geen
  // SmartScreen-voordeel meer geeft. Dat is niet nagemeten. Zolang dat zo is
  // mag geen van beide documenten het als vastgesteld presenteren.
  const LABEL = "becommentarieerde bewering en geen meting";

  it("staat zo in het register", () => {
    expect(REGISTER).toContain(LABEL);
  });

  it("staat zo in het document", () => {
    expect(DOC).toContain(LABEL);
  });

  it("het document noemt EV niet zonder dat label", () => {
    if (DOC.includes("EV-certificaat") || /\bEV\b/.test(DOC)) {
      expect(DOC).toContain(LABEL);
    }
  });
});

/**
 * De operator-lijst in CLAUDE.md draagt stap 1 van dit dossier.
 *
 * Deze poort schakelt zichzelf uit. Vinkt Juan de stap af en haalt hij de kop
 * weg, dan vervalt de eis met hem mee — dezelfde vorm als
 * `lib/prijsknoppen.test.ts`, waar een verbod alleen geldt zolang de reden
 * ervoor bestaat. Een regel die blijft staan nadat zijn reden verdween, wordt
 * over een jaar weggehaald door iemand die niet meer weet waarom hij er stond.
 *
 * Zolang de kop er wel staat bewaakt hij twee dingen. De lijst herhaalt cijfers
 * uit `docs/claims.md` en mag er niet van afdrijven. En hij verwijst naar het
 * volgordedocument in plaats van stap 2 tot en met 4 na te vertellen: twee
 * lijsten die een volgorde dragen lopen uit elkaar, en dan bewaakt de zwakste.
 *
 * Alles wordt binnen het operator-blok gemeten en niet over het hele bestand.
 * CLAUDE.md draagt honderden bedragen in het logboek, en een logboekregel mag
 * de kop gerust citeren zonder dat deze poort daarover valt.
 */
describe("de operator-lijst, zolang hij dit dossier draagt", () => {
  const OPERATOR = lees(join(WORTEL, "CLAUDE.md"));
  const LIJSTKOP = "## Wacht op de operator";
  const KOP = "### Diaz Atlas — de betaalketen is nooit gelopen";

  /** Het operator-blok, tot de volgende kop van niveau twee. */
  function lijst(): string {
    const i = OPERATOR.indexOf(LIJSTKOP);
    if (i === -1) {
      throw new Error(
        `CLAUDE.md draagt geen sectie \`${LIJSTKOP}\`. Is hij hernoemd? ` +
          "Werk deze poort bij, of hij meet vanaf nu niets.",
      );
    }
    const rest = OPERATOR.slice(i + LIJSTKOP.length);
    const eind = rest.search(/^## /m);
    return eind === -1 ? rest : rest.slice(0, eind);
  }

  const LIJST = lijst();
  const aanwezig = LIJST.includes(KOP);

  /** De sectie zelf, tot de volgende kop van niveau drie. */
  function sectie(): string {
    const rest = LIJST.slice(LIJST.indexOf(KOP) + KOP.length);
    const eind = rest.search(/^### /m);
    return eind === -1 ? rest : rest.slice(0, eind);
  }

  it("snijdt het operator-blok werkelijk uit het bestand", () => {
    // Zonder deze controle slaagt alles hieronder ook op een lege string, en
    // dan meet de poort niets terwijl hij groen staat.
    expect(LIJST).toContain("### SEO-instrumenten");
    expect(LIJST.length).toBeLessThan(OPERATOR.length / 4);
  });

  it("draagt de sectie hooguit een keer", () => {
    const n = LIJST.split(KOP).length - 1;
    expect(n, `de kop komt ${n}x voor in het operator-blok`).toBeLessThanOrEqual(1);
  });

  it.runIf(aanwezig)("snijdt de sectie uit het blok", () => {
    const s = sectie();
    expect(s.length).toBeGreaterThan(200);
    expect(s.length).toBeLessThan(LIJST.length);
  });

  it.runIf(aanwezig)("draagt geen bedrag dat niet in de prijstabel staat", () => {
    const prijzen = prijzenUitClaims();
    const gevonden = [...sectie().matchAll(/€([\d.,]*\d)/g)].map((m) => m[1]);
    expect(
      gevonden.length,
      "geen enkel bedrag in de sectie — is de snijder stuk?",
    ).toBeGreaterThan(0);
    const vreemd = gevonden.filter((b) => !prijzen.has(normaliseer(b)));
    expect(
      vreemd,
      `bedrag(en) buiten de prijstabel van docs/claims.md: ${vreemd.join(", ")}`,
    ).toEqual([]);
  });

  it.runIf(aanwezig)("herhaalt het aantal checkout-sessies zoals het register het meet", () => {
    expect(sectie()).toContain(`${checkoutSessiesUitClaims()} checkout-sessies`);
  });

  it.runIf(aanwezig)("wijst voor de stappen erna naar het volgordedocument", () => {
    expect(sectie()).toContain("docs/diaz-atlas-volgorde.md");
  });
});
