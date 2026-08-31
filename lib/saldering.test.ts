import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights, POSTS, type Insight, type InsightBlock } from "./insights";

/* De poort op het NL saldering-cluster.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Bij de refresh van 2026-08-31 (kalenderrij J2) bleek de oudste
 * van de vijf artikelen te openen met "de afbouw van de salderingsregeling in
 * 2027". De uitvoerder spreekt dat woordelijk tegen: "Eerder was het plan om
 * deze vanaf 2025 af te bouwen. Maar het kabinet heeft besloten om de regeling
 * in 2027 helemaal te stoppen en niet eerder af te bouwen." De wet heet
 * be-eindiging, en het afbouwvoorstel (35.594) is een ander, niet doorgegaan
 * traject. Het woord staat wel in vrijwel elke samenvatting van derden, dus het
 * komt terug zodra iemand uit zo'n samenvatting overschrijft.
 *
 * Diezelfde meting legde iets zwaarders bloot: geen van de vijf artikelen
 * noemde de wettelijke ondergrens onder de terugleververgoeding, terwijl drie
 * ervan de lezer vragen een som te maken. Dat getal is kenbaar - het staat in
 * de wet - en zonder die bodem komt elke som te laag uit.
 *
 * WAT DEZE POORT DOET. Hij leest de waarden uit `docs/claims.md` en legt de
 * gepubliceerde kopij ertegen. Overschrijven zou een tweede kopie van hetzelfde
 * getal zijn, en dat is precies de bugklasse waarvoor dat bestand bestaat.
 *
 * WAT HIJ NIET DOET. Hij kan niet zien dat de bron verandert. De bodem loopt af
 * op 1 januari 2030 en de terugleverkosten zijn commercieel; die twee bewegen
 * buiten deze repo. Zie de houdbaarheidsalinea in `docs/claims.md`.
 *
 * De poort leest de GE-EXPORTEERDE data, niet de bestandstekst. Dit bestand
 * draagt de verboden woorden in zijn toelichting en in zijn zelftests, en kan
 * daar per constructie niet over struikelen - vier eerdere tekstscans in deze
 * repo deden dat wel. */

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf-8");

/** De sectie zelf, zodat een rij uit een buursectie niet meetelt. */
function saldSectie(): string {
  const kop = "### Salderingsregeling";
  const i = CLAIMS.indexOf(kop);
  if (i === -1)
    throw new Error(
      "docs/claims.md draagt geen saldering-sectie meer. Kopij mag zijn bron niet " +
        "overleven: zet de sectie terug, of haal de regelgevingsclaims uit de artikelen.",
    );
  const rest = CLAIMS.slice(i + kop.length);
  const eind = rest.search(/\r?\n## /);
  return rest.slice(0, eind === -1 ? undefined : eind);
}

/** Eén rij, op de naam van zijn eerste cel. Gooit bij nul of meer dan één -
 *  `.match()` zonder /g pakt stil de eerste, en dan publiceer je de verkeerde
 *  van twee rijen die hetzelfde feit dragen. */
function rij(naam: string): string {
  const treffers = saldSectie()
    .split(/\r?\n/)
    .filter((r) => r.startsWith(`| ${naam} |`));
  if (treffers.length !== 1)
    throw new Error(
      `docs/claims.md: rij "${naam}" komt ${treffers.length}x voor in de saldering-sectie, verwacht 1x.`,
    );
  return treffers[0];
}

/** De drie waarden die de kopij mag dragen, geparseerd uit hun eigen rij. */
const STOPDATUM = (() => {
  const m = rij("Salderen stopt").match(/\*\*(\d{1,2} \w+ \d{4})\*\*/);
  if (!m) throw new Error("docs/claims.md: geen vetgedrukte stopdatum in de rij 'Salderen stopt'.");
  return m[1];
})();

const BODEM = (() => {
  const m = rij("Terugleververgoeding").match(/minstens (\d{1,3}%)/);
  if (!m) throw new Error("docs/claims.md: geen 'minstens <n>%' in de rij 'Terugleververgoeding'.");
  return m[1];
})();

const BODEM_TOT = (() => {
  const m = rij("Terugleververgoeding").match(/tot (\d{1,2} \w+ \d{4})/);
  if (!m) throw new Error("docs/claims.md: geen 'tot <datum>' in de rij 'Terugleververgoeding'.");
  return m[1];
})();

/** Alle zichtbare kopij van één artikel, inclusief de zoekvelden. Bewust
 *  zonder de slug: die is een URL en geen proza. */
function kopij(p: Insight): string {
  const uit = (b: InsightBlock): string[] => {
    switch (b.type) {
      case "ul":
        return b.items;
      case "quote":
        return [b.text, b.cite ?? ""];
      default:
        return [b.text];
    }
  };
  return [p.title, p.summary, p.seo?.metaTitle ?? "", p.seo?.metaDescription ?? "", ...p.body.flatMap(uit)].join(" \n ");
}

/** Het cluster: Nederlandse energie-artikelen die over saldering schrijven.
 *  Afgeleid en niet ingetypt, zodat een zesde artikel er vanzelf onder valt.
 *
 *  De kruislink in het netcongestie-artikel brengt dat stuk hier binnen. Dat is
 *  opzet: wie het woord gebruikt, valt onder dezelfde regels - ook als saldering
 *  niet zijn onderwerp is. Elke assertie hieronder is voorwaardelijk, dus een
 *  artikel dat de bodem niet noemt wordt er ook niet op afgerekend. */
const CLUSTER = getAllInsights("nl")
  .filter((p) => p.tag === "Energy" && /salder/i.test(kopij(p)))
  .map((p) => [p.slug, kopij(p)] as const);

/* Uitzondering met reden en aantal. Een historisch juiste vermelding van het
 * eerdere, vervallen afbouwplan is nuttig - juist omdat de lezer dat woord
 * elders tegenkomt. Een tweede vermelding in hetzelfde artikel lift daar niet
 * stil op mee. */
const AFBOUW_MAG: Record<string, { aantal: number; reden: string }> = {
  "salderingsregeling-2027-wat-operators-nu-moeten-doen": {
    aantal: 1,
    reden:
      "noemt het vervallen afbouwplan expliciet om het te ontkennen ('het is ook geen afbouwpad'), " +
      "in de formulering van de Rijksoverheid zelf",
  },
};

const AFBOUW = /afbouw/i;
const PERCENTAGE = /\d{1,3}%/g;

describe("de meetlat zelf", () => {
  it("leest de drie waarden uit docs/claims.md", () => {
    expect(STOPDATUM).toBe("1 januari 2027");
    expect(BODEM).toBe("50%");
    expect(BODEM_TOT).toBe("1 januari 2030");
  });

  it("weigert een rij die niet bestaat, in plaats van stil niets te vinden", () => {
    expect(() => rij("Terugleververgoeding per kWh")).toThrow(/komt 0x voor/);
  });

  it("de afbouw-detector vuurt op de zin die de aanleiding was", () => {
    expect(AFBOUW.test("De afbouw van de salderingsregeling in 2027 is geen verrassing meer")).toBe(true);
    expect(AFBOUW.test("De salderingsregeling stopt op 1 januari 2027")).toBe(false);
  });

  it("de percentage-detector vindt een percentage en niet een kaal getal", () => {
    expect("minstens 50% van het kale leveringstarief".match(PERCENTAGE)).toEqual(["50%"]);
    expect("een terugverdientijd van 50 maanden".match(PERCENTAGE)).toBeNull();
  });

  it("het cluster is gevuld en bevat niet de hele NL-voorraad", () => {
    expect(CLUSTER.length).toBeGreaterThanOrEqual(5);
    const slugs = CLUSTER.map(([s]) => s);
    expect(slugs).toContain("salderingsregeling-2027-wat-operators-nu-moeten-doen");
    expect(slugs).not.toContain("wpm-de-omgevingsdienst-controleert-uw-cijfers-niet-uw-inzending");
    expect(CLUSTER.length).toBeLessThan(getAllInsights("nl").length);
  });
});

describe("het saldering-cluster volgt docs/claims.md", () => {
  it("noemt de regeling nergens een afbouw, op de gedocumenteerde uitzondering na", () => {
    for (const [slug, tekst] of CLUSTER) {
      const n = (tekst.match(/afbouw/gi) ?? []).length;
      const toegestaan = AFBOUW_MAG[slug]?.aantal ?? 0;
      expect(
        n,
        `${slug}: ${n}x "afbouw", toegestaan ${toegestaan}. De uitvoerder zegt woordelijk dat de ` +
          `regeling niet wordt afgebouwd maar per ${STOPDATUM} stopt. Klopt de vermelding historisch ` +
          `(het vervallen voorstel 35.594), zet hem dan in AFBOUW_MAG met een reden.`,
      ).toBe(toegestaan);
    }
  });

  it("elk percentage in de kopij is de bodem uit claims.md", () => {
    for (const [slug, tekst] of CLUSTER) {
      for (const p of tekst.match(PERCENTAGE) ?? []) {
        expect(p, `${slug}: publiceert ${p}, terwijl docs/claims.md ${BODEM} draagt`).toBe(BODEM);
      }
    }
  });

  it("wie de bodem noemt, noemt erbij tot wanneer hij geldt", () => {
    const jaar = BODEM_TOT.slice(-4);
    for (const [slug, tekst] of CLUSTER) {
      if (!tekst.includes(BODEM)) continue;
      expect(
        tekst.includes(jaar),
        `${slug}: noemt ${BODEM} zonder ${jaar}. Een minimum zonder einddatum leest als een tarief, ` +
          `en wat er na ${BODEM_TOT} geldt is niet vastgelegd.`,
      ).toBe(true);
    }
  });

  it("wie de bodem noemt, noemt ook de terugleverkosten", () => {
    for (const [slug, tekst] of CLUSTER) {
      if (!tekst.includes(BODEM)) continue;
      expect(
        /terugleverkosten/i.test(tekst),
        `${slug}: noemt ${BODEM} zonder de terugleverkosten. De ACM waarschuwt zelf dat die hoger ` +
          `kunnen uitvallen dan de vergoeding, dus de bodem alleen is de misleidende helft.`,
      ).toBe(true);
    }
  });

  it("minstens vier artikelen dragen de bodem - anders bewijzen de drie tests hierboven niets", () => {
    const met = CLUSTER.filter(([, t]) => t.includes(BODEM));
    expect(met.length).toBeGreaterThanOrEqual(4);
  });
});

describe("herzieningsdatums", () => {
  it("updatedAt ligt nooit voor publishedAt", () => {
    for (const p of POSTS) {
      if (!p.updatedAt) continue;
      expect(
        p.updatedAt >= p.publishedAt,
        `${p.slug}: updatedAt ${p.updatedAt} ligt voor publishedAt ${p.publishedAt}`,
      ).toBe(true);
    }
  });

  it("er staan er daadwerkelijk een paar - anders slaagt de test hierboven op een lege lijst", () => {
    expect(POSTS.filter((p) => p.updatedAt).length).toBeGreaterThanOrEqual(5);
  });
});
