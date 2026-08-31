import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights, POSTS } from "./insights";
import { kopij, ctaHrefs } from "./insight-kopij";

/* De poort op het NL WPM-cluster.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Bij kalenderrij J3 kwam er een tweede WPM-artikel bij, en
 * tegelijk bleek dat twee rijen in `docs/claims.md` die op "niet nagetrokken"
 * stonden vandaag wél natrekbaar zijn. De indieningsdatum staat er nu (uiterlijk
 * 30 juni), en de peildatum is jaarlijks in plaats van eenmalig. Het eerste
 * artikel droeg daardoor een disclaimer die niet meer klopte: het beloofde geen
 * indieningsdatum te noemen, terwijl die datum inmiddels kenbaar is.
 *
 * Dat is de vorm waar dit dossier gevoelig voor is. WPM geldt vandaag, het
 * toezicht kijkt of je cijfers geloofwaardig zijn, en de verleiding om een
 * sanctie of een landelijk cijfer erbij te schrijven is groot — precies de twee
 * dingen die in geen enkele bron staan.
 *
 * WAT DEZE POORT DOET. Hij leest de waarden uit `docs/claims.md` en legt de
 * gepubliceerde kopij ertegen. Overschrijven zou een tweede kopie van hetzelfde
 * getal zijn, en dat is de bugklasse waarvoor dat bestand bestaat.
 *
 * WAT HIJ NIET DOET. Hij kan niet zien dat de bron verandert. De drempel naar
 * 250 ligt als ontwerpbesluit klaar en kan in werking treden; dan verschuift
 * bijna elke rij hieronder. En hij kan geen uitspraak over de landelijke
 * rapportageronde herkennen die niet toevallig een percentage draagt — dat
 * verbod leeft in de kop van de sectie in `docs/claims.md` en in de
 * "Wat ik hier niet beweer"-alinea van het tweede artikel.
 *
 * De poort leest de GE-EXPORTEERDE data, niet de bestandstekst. Dit bestand
 * draagt de verboden woorden in zijn toelichting en in zijn zelftests, en kan
 * daar per constructie niet over struikelen — vier eerdere tekstscans in deze
 * repo deden dat wel. */

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf-8");

/** De sectie zelf, zodat een rij uit een buursectie niet meetelt. Stopt op de
 *  eerstvolgende kop van welk niveau dan ook: de saldering-sectie staat er
 *  direct onder en is óók een `###`. */
function wpmSectie(): string {
  const kop = "### WPM";
  const i = CLAIMS.indexOf(kop);
  if (i === -1)
    throw new Error(
      "docs/claims.md draagt geen WPM-sectie meer. Kopij mag zijn bron niet overleven: " +
        "zet de sectie terug, of haal de regelgevingsclaims uit de artikelen.",
    );
  const rest = CLAIMS.slice(i + kop.length);
  const eind = rest.search(/\r?\n#+ /);
  return rest.slice(0, eind === -1 ? undefined : eind);
}

/** Eén rij, op de naam van zijn eerste cel. Gooit bij nul of meer dan één —
 *  `.match()` zonder /g pakt stil de eerste, en dan publiceer je de verkeerde
 *  van twee rijen die hetzelfde feit dragen (gebeurd op 2026-08-23, #229). */
function rij(naam: string): string {
  const treffers = wpmSectie()
    .split(/\r?\n/)
    .filter((r) => r.startsWith(`| ${naam} |`));
  if (treffers.length !== 1)
    throw new Error(
      `docs/claims.md: rij "${naam}" komt ${treffers.length}x voor in de WPM-sectie, verwacht 1x.`,
    );
  return treffers[0];
}

function uitRij(naam: string, patroon: RegExp, wat: string): string {
  const m = rij(naam).match(patroon);
  if (!m) throw new Error(`docs/claims.md: geen ${wat} in de rij "${naam}".`);
  return m[1];
}

/** De vier datums en het toetswoord, geparseerd uit hun eigen rij. */
const DEADLINE = uitRij("Indieningsdeadline per jaar", /\*\*uiterlijk (\d{1,2} \p{L}+)\*\*/u, "vetgedrukte 'uiterlijk <datum>'");
const PEILDATUM = uitRij("Peildatum voor de drempel", /\*\*jaarlijks op (\d{1,2} \p{L}+)\*\*/u, "vetgedrukte 'jaarlijks op <datum>'");
const INWERKING = uitRij("In werking sinds", /\*\*(\d{1,2} \p{L}+) \d{4}\*\*/u, "vetgedrukte ingangsdatum");
const TOETSWOORD = uitRij("Toezicht", /gegevens \*\*(\p{L}+)\*\* zijn/u, "vetgedrukt toetswoord");

/** De datums die de kopij mag dragen. Drie, en geen vierde: elke andere
 *  dag-maandcombinatie in WPM-kopij is een getal zonder bron. */
const DATUMS_UIT_CLAIMS = new Set([DEADLINE, PEILDATUM, INWERKING]);

const MAAND =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december";

/** Elke dag-maandcombinatie in een stuk tekst. */
function datums(tekst: string): string[] {
  return [...tekst.matchAll(new RegExp(`\\b(\\d{1,2} (?:${MAAND}))\\b`, "gi"))].map((m) =>
    m[1].toLowerCase(),
  );
}

/** Woorden die een handhavingsgevolg beweren. `boete` en `dwangsom` mogen
 *  nergens staan — ook niet in een ontkenning, want ze staan in geen enkele
 *  bron. `sanctie` mag wél, uitsluitend in een zin die hem afwijst: beide
 *  artikelen dragen "Ik noem geen sanctie", en dat is precies de zin die
 *  `docs/claims.md` van ze vraagt. */
const NOOIT = /\b(boete|boetes|beboet|dwangsom|dwangsommen|handhavingsbesluit)\b/i;
const ALLEEN_ONTKENNEND = /\b(sanctie|sancties|handhaving)\b/i;
const ONTKENNING = /\b(geen|niet|nooit|zonder)\b/i;

function zinnen(tekst: string): string[] {
  return tekst
    .split(/(?<=[.!?:])\s+|\n/)
    .map((z) => z.trim())
    .filter(Boolean);
}

/** Het cluster: Nederlandse logistiek-artikelen die over WPM schrijven.
 *  Afgeleid en niet ingetypt, zodat een derde artikel er vanzelf onder valt.
 *  De ETS2-stukken dragen dezelfde tag en horen er niet bij — zie de
 *  afbakeningstest onder "de meetlat zelf". */
const IS_WPM = /\bWPM\b|omgevingsdienst|werkgebonden/i;
const LOGISTIEK = getAllInsights("nl").filter((p) => p.tag === "Logistics");
const CLUSTER = LOGISTIEK.filter((p) => IS_WPM.test(kopij(p)));

describe("de meetlat zelf", () => {
  it("leest vijf waarden uit docs/claims.md in plaats van ze over te schrijven", () => {
    expect(DEADLINE).toMatch(/^\d{1,2} \p{L}+$/u);
    expect(PEILDATUM).toMatch(/^\d{1,2} \p{L}+$/u);
    expect(INWERKING).toMatch(/^\d{1,2} \p{L}+$/u);
    expect(TOETSWOORD.length).toBeGreaterThan(4);
    expect(DATUMS_UIT_CLAIMS.size).toBe(3);
  });

  it("weigert een rij die niet bestaat, en een rij die twee keer staat", () => {
    expect(() => rij("Bestaat Niet")).toThrow(/komt 0x voor/);
  });

  it("eist dat docs/claims.md het toetswoord van de uitvoerder woordelijk draagt", () => {
    // Wordt dit een parafrase bij de bron, dan valt de poort om in plaats van
    // stil kopij toe te staan die de uitvoerder niet meer dekt.
    expect(rij("Toezicht")).toContain("De omgevingsdienst controleert of er is gerapporteerd");
    expect(TOETSWOORD).toBe("geloofwaardig");
  });

  it("vindt datums, en alleen datums", () => {
    expect(datums("uiterlijk 30 juni, sinds 1 juli 2024")).toEqual(["30 juni", "1 juli"]);
    expect(datums("in 2026 over 2025 en 2024")).toEqual([]);
  });

  it("scheidt een bewering over handhaving van een afwijzing ervan", () => {
    expect(NOOIT.test("je riskeert een boete")).toBe(true);
    expect(NOOIT.test("je riskeert niets")).toBe(false);
    const afwijzing = "Ik noem geen sanctie.";
    expect(ALLEEN_ONTKENNEND.test(afwijzing) && ONTKENNING.test(afwijzing)).toBe(true);
    const bewering = "De omgevingsdienst legt een sanctie op.";
    expect(ALLEEN_ONTKENNEND.test(bewering) && ONTKENNING.test(bewering)).toBe(false);
  });

  it("bakent het cluster af op WPM en niet op de tag", () => {
    expect(CLUSTER.length).toBeGreaterThanOrEqual(2);
    // De ETS2-stukken dragen ook tag "Logistics". Vallen die er ook onder, dan
    // rekent deze poort ze af op regels die niet over hun onderwerp gaan.
    expect(CLUSTER.length).toBeLessThan(LOGISTIEK.length);
    expect(LOGISTIEK.length).toBeLessThan(getAllInsights("nl").length);
  });
});

describe("het WPM-cluster in docs/claims.md", () => {
  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s draagt geen datum die niet uit claims.md komt",
    (_slug, tekst) => {
      const vreemd = datums(tekst).filter((d) => !DATUMS_UIT_CLAIMS.has(d));
      expect(vreemd, `datum zonder rij in docs/claims.md: ${vreemd.join(", ")}`).toEqual([]);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s beweert niets over handhavingsgevolgen",
    (_slug, tekst) => {
      expect(NOOIT.test(tekst), "docs/claims.md: sancties zijn niet nagetrokken").toBe(false);
      const beweringen = zinnen(tekst).filter(
        (z) => ALLEEN_ONTKENNEND.test(z) && !ONTKENNING.test(z),
      );
      expect(beweringen, `zin die handhaving beweert in plaats van afwijst`).toEqual([]);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s draagt geen percentage — docs/claims.md draagt er geen",
    (_slug, tekst) => {
      expect(
        /\d{1,3}\s?%|\bprocent\b/i.test(tekst),
        "zet het cijfer eerst in docs/claims.md, met bron",
      ).toBe(false);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s noemt bij de nieuwe drempel dat het moment onbekend is",
    (_slug, tekst) => {
      const noemtDrempel = /\b250\b|tweehonderdvijftig/i.test(tekst);
      if (!noemtDrempel) return;
      expect(
        /(moment|wanneer|datum)[^.]{0,60}niet bekend|niet bekend wanneer/i.test(tekst),
        "docs/claims.md: schrijf nooit dat de drempel al 250 is, en nooit een datum",
      ).toBe(true);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s noemt bij de omgevingsdienst ook de tweede helft van de toets",
    (_slug, tekst) => {
      if (!/omgevingsdienst/i.test(tekst)) return;
      const tweedeHelft = new RegExp(`${TOETSWOORD}|kwaliteit van (de|je) gegevens`, "i");
      expect(
        tweedeHelft.test(tekst),
        "het toezicht kijkt naar inzending EN naar de tweede helft; die helft is de hele haak",
      ).toBe(true);
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, kopij(p)] as const))(
    "%s belooft niet langer dat het geen indieningsdatum noemt",
    (_slug, tekst) => {
      // Die disclaimer stond in het eerste artikel en was op 2026-08-31 onwaar
      // geworden: de datum staat sindsdien in docs/claims.md.
      expect(/geen indieningsdatum/i.test(tekst)).toBe(false);
    },
  );
});

describe("het cluster hangt aan elkaar", () => {
  const SLUGS = new Set(POSTS.map((p) => p.slug));
  const IN_CLUSTER = new Set(CLUSTER.map((p) => p.slug));

  it.each(CLUSTER.map((p) => [p.slug, ctaHrefs(p)] as const))(
    "%s verwijst naar een slug die bestaat",
    (_slug, hrefs) => {
      for (const href of hrefs) {
        const m = href.match(/^\/insights\/([a-z0-9-]+)$/);
        expect(m, `cta-href buiten /insights/<slug>: ${href}`).not.toBeNull();
        expect(SLUGS.has(m![1]), `cta wijst naar een slug die niet bestaat: ${href}`).toBe(true);
      }
    },
  );

  it.each(CLUSTER.map((p) => [p.slug, ctaHrefs(p)] as const))(
    "%s is geen wees: hij linkt naar een ander stuk uit het cluster",
    (slug, hrefs) => {
      const buren = hrefs
        .map((h) => h.replace("/insights/", ""))
        .filter((s) => IN_CLUSTER.has(s) && s !== slug);
      expect(buren.length, "elk stuk linkt naar en wordt gelinkt vanaf een ander stuk").toBeGreaterThan(0);
    },
  );
});
