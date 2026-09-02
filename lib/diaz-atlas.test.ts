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
