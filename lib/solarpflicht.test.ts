import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "./insights";
import { kopij, ctaHrefs } from "./insight-kopij";

/* De poort op het DE Solarpflicht-cluster.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Kalenderrij J4 beschreef Solarpflicht als een puur
 * landesrechtelijk lappendeken. Bij het natrekken bij de uitvoerder bleek dat
 * sinds eind juli 2026 niet meer te kloppen: het GModG legt met § 106 een
 * bondsstaffel over het landesrecht heen, en Abs. 4 laat strenger landesrecht
 * uitdrukkelijk staan. Het onderwerp is daarop bijgesteld, net als bij J3.
 *
 * Dit dossier is gevoelig voor precies twee verleidingen. De eerste is een
 * tabel over alle zestien Länder — er is er één nagetrokken. De tweede is een
 * Bußgeld of een anlagengrootte erbij schrijven; die staan in geen van beide
 * bronnen.
 *
 * WAT DEZE POORT DOET. Hij leest de datums en het nagetrokken Land uit
 * `docs/claims.md` en legt de gepubliceerde kopij ertegen. Overschrijven zou
 * een tweede kopie van hetzelfde feit zijn, en dat is de bugklasse waarvoor
 * dat bestand bestaat.
 *
 * WAT HIJ NIET DOET. Hij kan niet zien dat de bron verandert — Artikel 3 en 4
 * van hetzelfde GModG raken § 106 vandaag niet, maar een volgende wijziging
 * kan de staffel verzetten. En hij kan geen uitspraak over een ander
 * Bundesland herkennen die dat Land niet bij naam noemt.
 *
 * De poort leest de GE-EXPORTEERDE data, niet de bestandstekst. Dit bestand
 * draagt de verboden woorden in zijn toelichting en in zijn zelftests, en kan
 * daar per constructie niet over struikelen — vier eerdere tekstscans in deze
 * repo deden dat wel. */

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf-8");

/** De sectie zelf, zodat een rij uit een buursectie niet meetelt. */
function sectie(): string {
  const kop = "### Solarpflicht";
  const i = CLAIMS.indexOf(kop);
  if (i === -1)
    throw new Error(
      "docs/claims.md draagt geen Solarpflicht-sectie meer. Kopij mag zijn bron niet " +
        "overleven: zet de sectie terug, of haal de regelgevingsclaims uit het artikel.",
    );
  const rest = CLAIMS.slice(i + kop.length);
  const eind = rest.search(/\r?\n#+ /);
  return rest.slice(0, eind === -1 ? undefined : eind);
}

/** Elke vetgedrukte Duitse datum uit de sectie. Dit is de enige lijst datums
 *  die de kopij mag dragen; elke andere is een getal zonder bron. */
function datumsUitClaims(): Set<string> {
  const gevonden = [...sectie().matchAll(/\*\*(\d{1,2}\. \p{L}+ \d{4})\*\*/gu)].map((m) => m[1]);
  if (gevonden.length < 10)
    throw new Error(
      `docs/claims.md: ${gevonden.length} vetgedrukte datums in de Solarpflicht-sectie, ` +
        "verwacht er minstens 10. Staat de tabel er nog?",
    );
  return new Set(gevonden);
}
const DATUMS = datumsUitClaims();

/** Het enige Land dat is nagetrokken, geparseerd uit zijn eigen rij. */
function landUitClaims(): string {
  const m = sectie().match(/\*\*alleen ([^*]+)\*\*/u);
  if (!m) throw new Error('docs/claims.md: geen rij met "**alleen <Land>**" in de Solarpflicht-sectie.');
  return m[1].trim();
}
const LAND = landUitClaims();

/** De vijftien andere. Staat er één in de kopij, dan is er een uitspraak
 *  gedaan over een Land dat niemand heeft nagetrokken. */
const ALLE_LANDEN = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

const MONAT =
  "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember";

/** Elke volledige Duitse datum in een stuk tekst. Kale jaartallen tellen niet:
 *  "ab 2030 und 2033" is een verwijzing naar § 40 en geen stichtag. */
function datums(tekst: string): string[] {
  return [...tekst.matchAll(new RegExp(`\\b(\\d{1,2}\\. (?:${MONAT}) \\d{4})\\b`, "g"))].map(
    (m) => m[1],
  );
}

/** Woorden die alleen in een afwijzende zin mogen staan. Het artikel draagt ze
 *  in zijn "Was ich hier nicht behaupte"-alinea, en dat is precies de zin die
 *  `docs/claims.md` ervan vraagt. */
const ALLEEN_ONTKENNEND = /\b(Bußgeld|Bußgelder|Bußgeldhöhe|Sanktion|Sanktionen|Kilowatt-Peak|kWp)\b/iu;
const ONTKENNUNG = /\b(kein|keine|keinen|keiner|keines|nicht|nie|ohne|nichts)\b/iu;

/** Zinnen, zonder te breken op een Duits rangtelwoord. `1. Januar` draagt een
 *  punt die geen zinseinde is; wie daarop splitst, scheidt een verboden woord
 *  van de ontkenning die het afwijst. Bekende grens: een zin die op een cijfer
 *  plus punt eindigt wordt aan de volgende geplakt. */
function zinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[^\d][.!?:])\s+|\n/)
    .map((z) => z.trim())
    .filter(Boolean);
}

/** Het cluster: Duitse energie-artikelen die de bondsstaffel dragen.
 *
 *  BEWUST OP `§ 106` EN NIET OP HET WOORD SOLARPFLICHT. `kopij()` neemt het
 *  LABEL van een cta mee, en het zusterartikel over de Einspeisevergütung
 *  draagt sinds de kruislink letterlijk "bundesweite Solarpflicht". Een
 *  clusterregel op dat woord zou dat artikel erbij trekken en het afrekenen op
 *  regels die niet over zijn onderwerp gaan. */
const IS_SOLAR = /§ 106|Gebäudemodernisierungsgesetz/u;
const DE_ENERGIE = getAllInsights("de").filter((p) => p.tag === "Energy");
const CLUSTER = DE_ENERGIE.filter((p) => IS_SOLAR.test(kopij(p)));

describe("de meetlat zelf", () => {
  it("leest de datums en het Land uit docs/claims.md in plaats van ze over te schrijven", () => {
    expect(DATUMS.size).toBe(10);
    for (const d of DATUMS) expect(d).toMatch(/^\d{1,2}\. \p{L}+ \d{4}$/u);
    expect(ALLE_LANDEN).toContain(LAND);
  });

  it("vindt volledige datums, en geen kale jaartallen", () => {
    expect(datums("ab dem 1. Januar 2027 und dem 1. Mai 2022")).toEqual([
      "1. Januar 2027",
      "1. Mai 2022",
    ]);
    expect(datums("die ab 2030 und 2033 greifen")).toEqual([]);
  });

  it("splitst zinnen zonder op een Rangtelwoord te breken", () => {
    // Zou de splitser hier drie stukken maken, dan raakt "keine" los van het
    // woord dat het afwijst en meldt de poort een overtreding die er niet is.
    expect(zinnen("Ab dem 1. Januar 2027 gilt das. Und dann folgt mehr.")).toHaveLength(2);
  });

  it("scheidt een bewering over handhaving van een afwijzing ervan", () => {
    const afwijzing = "Ich nenne keine Bußgeldhöhe.";
    expect(ALLEEN_ONTKENNEND.test(afwijzing) && ONTKENNUNG.test(afwijzing)).toBe(true);
    const bewering = "Die Behörde verhängt ein Bußgeld.";
    expect(ALLEEN_ONTKENNEND.test(bewering) && ONTKENNUNG.test(bewering)).toBe(false);
  });

  it("bakent het cluster af op de bondsstaffel en niet op het woord Solarpflicht", () => {
    expect(CLUSTER.length).toBeGreaterThanOrEqual(1);
    // Het zusterartikel draagt sinds de kruislink het woord Solarpflicht in
    // zijn cta-label. Valt het toch in het cluster, dan is de discriminator
    // stil verschoven en rekent deze poort het af op andermans regels.
    const zuster = DE_ENERGIE.find(
      (p) => p.slug === "sinkende-einspeiseverguetung-was-installateure-sagen-muessen",
    );
    expect(zuster, "het zusterartikel is weg of hernoemd").toBeDefined();
    expect(/Solarpflicht/u.test(kopij(zuster!))).toBe(true);
    expect(CLUSTER.map((p) => p.slug)).not.toContain(zuster!.slug);
    expect(CLUSTER.length).toBeLessThan(DE_ENERGIE.length);
  });
});

describe("het Solarpflicht-cluster tegen docs/claims.md", () => {
  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s draagt geen datum die niet uit claims.md komt",
    (_slug, tekst) => {
      const vreemd = datums(tekst).filter((d) => !DATUMS.has(d));
      expect(vreemd, `datum zonder rij in docs/claims.md: ${vreemd.join(", ")}`).toEqual([]);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s beweert niets over Bußgeld of anlagengrootte",
    (_slug, tekst) => {
      const beweringen = zinnen(tekst).filter(
        (z) => ALLEEN_ONTKENNEND.test(z) && !ONTKENNUNG.test(z),
      );
      expect(
        beweringen,
        "docs/claims.md: sancties en kWp zijn niet nagetrokken",
      ).toEqual([]);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s noemt alleen het Land dat is nagetrokken",
    (_slug, tekst) => {
      expect(tekst).toContain(LAND);
      const andere = ALLE_LANDEN.filter((l) => l !== LAND).filter((l) =>
        tekst.replaceAll(LAND, "").includes(l),
      );
      expect(
        andere,
        `Land zonder rij in docs/claims.md: ${andere.join(", ")}`,
      ).toEqual([]);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s wijst een overzicht van alle zestien Länder expliciet af",
    (_slug, tekst) => {
      expect(
        /keine Übersicht über alle sechzehn/u.test(tekst),
        "er is één Land nagetrokken; zeg dat, of trek de rest na",
      ).toBe(true);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s zegt dat het landesrecht naast het bondsrecht blijft staan",
    (_slug, tekst) => {
      // § 106 Abs. 4. Zonder deze zin leest de staffel als een vervanging van
      // het landesrecht, en dat is precies omgekeerd.
      expect(tekst).toContain("Landesrecht");
    },
  );

  it.each(CLUSTER.map((p) => [p.slug] as const))(
    "%s draagt de kop Was ich hier nicht behaupte",
    (slug) => {
      const post = CLUSTER.find((p) => p.slug === slug)!;
      const koppen = post.body.filter((b) => b.type === "h2").map((b) => b.text);
      expect(koppen).toContain("Was ich hier nicht behaupte");
    },
  );
});

describe("de kruislink loopt beide kanten op", () => {
  const NIEUW = "solarpflicht-ab-2027-welche-pflicht-zuerst-greift";
  const ZUSTER = "sinkende-einspeiseverguetung-was-installateure-sagen-muessen";

  it("beide artikelen bestaan in de DE-markt", () => {
    const slugs = getAllInsights("de").map((p) => p.slug);
    expect(slugs).toContain(NIEUW);
    expect(slugs).toContain(ZUSTER);
  });

  it("verwijzen naar elkaar, en naar een slug die bestaat", () => {
    const bij = (s: string) => getAllInsights("de").find((p) => p.slug === s)!;
    expect(ctaHrefs(bij(NIEUW))).toContain(`/insights/${ZUSTER}`);
    expect(ctaHrefs(bij(ZUSTER))).toContain(`/insights/${NIEUW}`);
  });
});
