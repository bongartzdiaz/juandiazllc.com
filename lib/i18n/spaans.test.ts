import { describe, it, expect } from "vitest";
import { DICT } from "./dict";
import { SECTORS } from "../sectors";
import { VENTURES } from "../ventures";
import { POSTS } from "../insights";
import { SIGNALS } from "../signals";

/* Drie poorten op het Spaanse register.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. De Spaanse site is tú, op 24 vindplaatsen na die usted zeiden.
 * Het scherpste bewijs stond in twee zinnen die elkaar tegenspraken:
 * `cta.lede` zei "Si no, **te** digo quién puede", `contact.page.lede` zei
 * "Si no, **le** digo quién sí puede" — dezelfde zin, twee registers. En
 * `cta.title.b` zei "los ingresos que **estás** dejando sobre la mesa" naast
 * `contact.page.title` met "que **está** dejando".
 *
 * WAAROM DIT MOEILIJKER IS DAN DUITS. Spaans laat het voornaamwoord meestal
 * weg; het register zit in de werkwoordsuitgang. "Deje sus datos y cuénteme"
 * bevat het woord `usted` niet en is het wel. Een scan op het voornaamwoord
 * telde er vijf van de vierentwintig. Daar komt bij dat `su`/`sus` in het
 * Spaans óók derde persoon is ("su factura" van de klant), dus die twee zijn
 * niet te verbieden zonder tientallen valse treffers.
 *
 * Vandaar drie lagen die elk iets zien wat de andere twee missen:
 *
 *   1. Het voornaamwoord en een handvol ondubbelzinnige usted-vormen. Hard,
 *      geen uitzonderingen. Goedkoop, en het vangt de botte gevallen.
 *
 *   2. Een expliciete lijst van vormen die BEWUST niet verboden zijn, met de
 *      reden. `quiere`, `vea` en `prefiere` staan alle drie nog in de kopij
 *      als derde persoon; ze verbieden zou de poort binnen een week uitzetten.
 *
 *   3. De gekoppelde regel: waar het Nederlands de lezer informeel aanspreekt,
 *      moet het Spaans dat ook doen. Dit is het eigenlijke net. Laag 1 en een
 *      handmatige werkwoordssweep misten allebei `contact.page.title` en
 *      `priv.optout.body`; deze regel ving ze wel, omdat het Nederlands ernaast
 *      onafhankelijk vastlegt dát de zin de lezer aanspreekt.
 *
 * WAT DEZE POORT NIET ZIET. Of het Spaans klópt — daar is een lezer voor.
 * Een usted-zin waar het Nederlands de lezer niet aanspreekt. En kopij die
 * via een prop van een oudercomponent binnenkomt.
 *
 * Alle drie lezen de geëxporteerde data en niet de bestandstekst, zodat dit
 * bestand niet struikelt over zijn eigen toelichting — waarin de verboden
 * vormen nu eenmaal moeten staan. Bewezen met een groene mutatie. */

type Herkomst = [sleutel: string, waarde: string];

/** Platslaan tot losse strings, met het veldpad als sleutel. */
function plat(o: unknown, pad: string): Herkomst[] {
  if (typeof o === "string") return [[pad, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => plat(v, `${pad}[${i}]`));
  if (o && typeof o === "object")
    return Object.entries(o).flatMap(([k, v]) => plat(v, `${pad}.${k}`));
  return [];
}

/** Splitst op alles wat geen letter of cijfer is. Een regex-literal, geen
 *  opgebouwde string: die laatste gaat door string-escaping heen, en zo
 *  veranderde een woordgrens-patroon hier eerder in een backspace-teken.
 *
 *  De accenten in de klasse zijn niet cosmetisch. `\b` is in JS ASCII-gebaseerd,
 *  dus `/\bpida\b/` matcht ín `rápida` — er staat een "woordgrens" vóór de p
 *  omdat `á` geen woordkarakter is. Geen enkele vlag repareert dat, ook `u`
 *  niet. Splitsen op een klasse die de accenten kent, wél. */
function woorden(zin: string): string[] {
  return zin
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/)
    .filter(Boolean);
}

/* ── laag 1: vormen die niet mogen terugkomen ─────────────────────────────── */

/* Elk met de reden en de tú-vorm die ervoor in de plaats kwam. Alleen vormen
 * die in het Spaans ondubbelzinnig usted zijn: het voornaamwoord zelf, en
 * imperatieven met een aangehecht voornaamwoord (-se/-me/-le/-nos), die geen
 * tweede lezing hebben. Bewust kort — zie laag 2. */
const NIET_MEER: Record<string, string> = {
  usted: 'het voornaamwoord zelf. Stond in priv.title ("de usted") en now.outro.1; nu "de ti".',
  ustedes: "meervoudsvorm van hetzelfde; kwam niet voor en hoort dat zo te houden.",
  sáltese: 'usted-imperatief van saltarse, in sp.p.teacher2. Nu "sáltate".',
  escríbame: 'usted-imperatief met clitic, in priv.p.contact en priv.p.newsletter. Nu "escríbeme".',
  cuénteme: 'usted-imperatief met clitic, in contact.page.lede. Nu "cuéntame".',
  déjeme: 'usted-imperatief met clitic, in insights.d.want.cta. Nu "déjame".',
  pregúntele: 'usted-imperatief met clitic, in roi.smallprint. Nu "pregúntale".',
  introduzca: 'usted-imperatief van introducir, in roi.lede. Nu "introduce".',
  escríbanos: "zelfde vorm, kwam niet voor; staat er zodat hij niet binnensluipt.",
  déjenos: "zelfde vorm in de wij-variant; kwam niet voor en hoort dat zo te houden.",
};

/* Vormen die in het Spaans ÓÓK derde persoon zijn en daarom bewust NIET op de
 * lijst hierboven staan. Ze zijn stuk voor stuk teruggedraaid als aanspreekvorm,
 * maar staan elders nog terecht in de kopij — `quiere` 5×, `vea` 2×,
 * `prefiere` 1×. Zou iemand ze alsnog verbieden, dan gaat de poort af op
 * correcte zinnen en wordt hij binnen een week uitgezet. */
const DUBBELZINNIG: Record<string, string> = {
  quiere: 'ook "hij/zij wil" — "el cliente quiere".',
  vea: 'ook aanvoegende wijs — "para que yo los vea".',
  prefiere: 'ook "hij/zij verkiest".',
  use: 'ook aanvoegende wijs — "para que use".',
  deje: "idem, en zelfstandig naamwoord in samenstellingen.",
  abre: 'ook "hij/zij opent".',
  envía: 'ook "hij/zij verstuurt".',
  está: 'derde persoon van estar; staat overal — "lo que está pasando".',
};

/* ── laag 3: de gekoppelde regel ──────────────────────────────────────────── */

const NL_INFORMEEL = ["je", "jij", "jouw", "jou", "jullie"];

/* Woorden die het Spaans als tú-aanspreking markeren. Voornaamwoorden en
 * bezittelijke vormen zijn ondubbelzinnig; de werkwoorden erachter zijn
 * werkelijk in onze kopij gebruikte tú-vormen, geen speculatieve lijst.
 *
 * Schrijft iemand nieuwe tú-kopij met een werkwoord dat hier niet staat, dan
 * gaat deze poort af. Dat is LUID en heeft twee geldige oplossingen: de zin is
 * usted (repareer de zin), of de zin is tú met een nieuwe vorm (zet hem erbij).
 * De foutmelding zegt dat er ook bij. */
const TU_MARKERS = [
  // voornaamwoorden en bezittelijk — ondubbelzinnig
  "tú", "tu", "tus", "te", "ti", "tuyo", "tuya", "contigo",
  // tú-werkwoordsvormen die in deze kopij staan
  "estás", "tienes", "puedes", "quieres", "sabes", "haces", "vas", "eres",
  "necesitas", "confías", "acabas", "prefieres", "esperarías", "vendes",
  "dejas", "pierdes", "recorre", "dibuja", "ordena",
  // let op: "pruebas" is ook een zelfstandig naamwoord. Hier staat het als
  // werkwoord ("Pruebas bajo carga", nl "Je test onder ..."). Het marker-zijn
  // maakt de poort op dat punt iets toegeeflijker, niet valser.
  "pruebas",
];

/* Sleutels waar het Nederlands de lezer aanspreekt en het Spaans bewust
 * niemand aanspreekt. Elk met de constructie erbij, want zonder reden wordt
 * zo'n lijst een plek om een echte usted-zin in te verstoppen. */
const ONPERSOONLIJK: Record<string, string> = {
  "services.page.lede": 'infinitief: "antes de firmar un contrato".',
  "services.advisory.body": 'infinitieven: "antes de comprometer presupuesto", "qué comprar".',
  "services.advisory.symptom": 'geen werkwoord: "Un contrato de proveedor sobre la mesa".',
  "process.1.body": 'infinitieven: "Ver lo que está pasando", "Encontrar las fugas".',
  "sp.p.teacher1": 'onpersoonlijk se: "No se le puede mentir a un edificio".',
  "sp.p.now1": 'onpersoonlijk: "el tipo de fecha límite que permite hacer apuestas".',
  "faq.contact.title": 'infinitief: "Antes de reservar una llamada".',
  "voltafy.story": 'derde persoon: "la plataforma a la que se conectan los otros tres".',
  "voltafy.phases[2].body": 'eerste persoon meervoud: "Entregamos la capa de plataforma".',
  "help-mij-besparen.summary": 'derde persoon: "que muestra a los hogares neerlandeses".',
  "instruments-not-saas.body[7].text": 'eerste persoon: "Cada producto que he entregado".',
  "five-phases.excerpt": 'derde persoon: "Los jefes de obra saben algo".',
  "five-phases.body[1].text": 'onpersoonlijk: "Un edificio no se entrega a ojo".',
};

/* ── de bronnen ───────────────────────────────────────────────────────────── */

const esInsights = POSTS.flatMap((p) => [
  ...plat(p.i18n?.es ?? {}, `${p.slug}:i18n`),
  ...(p.markets?.includes("es")
    ? plat({ title: p.title, summary: p.summary, body: p.body }, `${p.slug}:basis`)
    : []),
]);

/* (bestand, strings, ondergrens). De ondergrens per bron, niet gedeeld: een
 * gedeelde drempel laat een bron die naar bijna nul zakt meeliften op de rest. */
const BRONNEN: Array<[bestand: string, strings: Herkomst[], minimaal: number]> = [
  ["lib/i18n/dict.ts", Object.entries(DICT.es), 600],
  ["lib/sectors.ts", SECTORS.flatMap((s) => plat(s.i18n?.es ?? {}, s.slug)), 100],
  ["lib/ventures.ts", VENTURES.flatMap((v) => plat(v.i18n?.es ?? {}, v.slug)), 90],
  ["lib/signals.ts", SIGNALS.flatMap((s) => plat(s.i18n?.es ?? {}, s.slug)), 40],
  ["lib/insights.ts", esInsights, 300],
];

/** Elke plek waar een teruggedraaide usted-vorm terugstaat, met de reden. */
function verbodenTreffers(strings: Herkomst[]): string[] {
  const uit: string[] = [];
  for (const [vorm, reden] of Object.entries(NIET_MEER)) {
    for (const [k, v] of strings) {
      if (woorden(v).includes(vorm)) uit.push(`${k} → "${vorm}": ${reden}`);
    }
  }
  return uit;
}

/* ── poort op de splitser zelf ────────────────────────────────────────────── */

describe("de splitser zelf", () => {
  /* Zonder deze drie is elke groene uitkomst hieronder ook te verklaren door
     een splitser die niets vindt. */
  it("houdt een woord met accent heel", () => {
    expect(woorden("no es rápida")).toEqual(["no", "es", "rápida"]);
    expect(woorden("no es rápida")).not.toContain("pida");
  });

  it("houdt een cijfer aan zijn afkorting vast", () => {
    expect(woorden("responde en 24h")).toContain("24h");
  });

  it("laat html-tags niet meetellen als woord", () => {
    expect(woorden("sabe <em>de ti</em>")).toEqual(["sabe", "de", "ti"]);
  });

  it("vindt een usted-vorm die er wél staat", () => {
    expect(verbodenTreffers([["proef", "Deje sus datos, usted."]])).toHaveLength(1);
    expect(verbodenTreffers([["proef", "Deja tus datos."]])).toEqual([]);
  });
});

/* ── laag 1 + 2 ───────────────────────────────────────────────────────────── */

describe.each(BRONNEN)("de Spaanse kopij in %s", (_bestand, strings, minimaal) => {
  it("wordt daadwerkelijk gelezen", () => {
    expect(strings.length).toBeGreaterThanOrEqual(minimaal);
  });

  it("spreekt de lezer nergens met usted aan", () => {
    expect(
      verbodenTreffers(strings),
      "De Spaanse site is tú. Zie de reden achter elke vorm; wil je hier " +
        "bewust van afwijken, zet dan een uitzondering met reden neer in " +
        "plaats van de regel te verzachten.",
    ).toEqual([]);
  });
});

describe("de verbodslijst blijft smal", () => {
  /* Een verbod op een dubbelzinnige vorm gaat af op correcte kopij, en een
     poort die vals alarm slaat wordt uitgezet. Dat is hoe je een echte
     bewaking verliest om een onechte te winnen. */
  it("verbiedt geen vorm die ook derde persoon kan zijn", () => {
    const fout = Object.keys(DUBBELZINNIG).filter((v) => v in NIET_MEER);
    expect(fout, "deze vormen staan elders terecht in de kopij").toEqual([]);
  });

  it("noemt bij elke verboden vorm een reden", () => {
    const zonder = Object.entries(NIET_MEER).filter(([, r]) => r.trim().length < 20);
    expect(zonder.map(([v]) => v)).toEqual([]);
  });
});

/* ── laag 3: de gekoppelde regel ──────────────────────────────────────────── */

/** Elk sleutelpad waar nl informeel aanspreekt en es geen tú-vorm draagt. */
function ongepaard(paren: Array<[pad: string, nl: string, es: string]>): string[] {
  return paren
    .filter(([, nl]) => woorden(nl).some((w) => NL_INFORMEEL.includes(w)))
    .filter(([, , es]) => !woorden(es).some((w) => TU_MARKERS.includes(w)))
    .map(([pad, , es]) => `${pad} → "${es.slice(0, 70)}"`);
}

/* De koppeling per bron. Insights doet niet mee: de Spaanse artikelen zijn
 * marktspecifiek en hebben geen Nederlandse tegenhanger onder dezelfde slug,
 * dus daar valt niets te paren. Voor die bron doet laag 1 het werk. */
const GEKOPPELD: Array<[pad: string, nl: string, es: string]> = [
  ...Object.keys(DICT.nl).map(
    (k) => [k, DICT.nl[k] ?? "", DICT.es[k] ?? ""] as [string, string, string],
  ),
  ...[...SECTORS, ...VENTURES, ...SIGNALS].flatMap((r) => {
    const nl = new Map(plat(r.i18n?.nl ?? {}, r.slug));
    const es = new Map(plat(r.i18n?.es ?? {}, r.slug));
    return [...nl].map(([pad, v]) => [pad, v, es.get(pad) ?? ""] as [string, string, string]);
  }),
];

describe("waar het Nederlands de lezer aanspreekt, doet het Spaans dat ook", () => {
  const paden = new Set(GEKOPPELD.map(([p]) => p));

  it("leest werkelijk beide talen", () => {
    expect(GEKOPPELD.length).toBeGreaterThan(700);
    expect(GEKOPPELD.some(([, nl, es]) => nl && es)).toBe(true);
  });

  it("gaat af op een zin die de lezer met usted aanspreekt", () => {
    expect(ongepaard([["proef", "Laat je gegevens achter", "Deje sus datos"]])).toHaveLength(1);
    expect(ongepaard([["proef", "Laat je gegevens achter", "Deja tus datos"]])).toEqual([]);
  });

  it("laat geen sleutel over buiten de uitzonderingen", () => {
    const over = ongepaard(GEKOPPELD).filter(
      (r) => !(r.split(" → ")[0] in ONPERSOONLIJK),
    );
    expect(
      over,
      "Twee geldige oplossingen: de zin is usted (herschrijf hem naar tú), " +
        "óf de zin is tú met een werkwoordsvorm die nog niet in TU_MARKERS " +
        "staat (zet hem erbij). Is het Spaans hier bewust onpersoonlijk, dan " +
        "hoort de sleutel in ONPERSOONLIJK met de constructie erbij.",
    ).toEqual([]);
  });

  it("draagt geen uitzondering die niet meer waar is", () => {
    const gemeten = new Set(ongepaard(GEKOPPELD).map((r) => r.split(" → ")[0]));
    const verouderd = Object.keys(ONPERSOONLIJK).filter((k) => !gemeten.has(k));
    expect(
      verouderd,
      "deze sleutels staan als onpersoonlijk genoteerd maar zijn dat niet " +
        "meer — haal ze uit ONPERSOONLIJK in plaats van de lijst te laten staan",
    ).toEqual([]);
  });

  it("noemt in elke uitzondering welke constructie het Spaans gebruikt", () => {
    const zonder = Object.entries(ONPERSOONLIJK).filter(([, r]) => r.trim().length < 20);
    expect(zonder.map(([k]) => k)).toEqual([]);
    expect(Object.keys(ONPERSOONLIJK).every((k) => paden.has(k))).toBe(true);
  });
});

describe("de Spaanse poort leest elke kopijbron", () => {
  /* Zonder deze lijst kan een bron stil verdwijnen: de tests hierboven draaien
   * dan door over wat er nog wél in staat en de dekking krimpt zonder dat iets
   * rood wordt. Zo stond `lib/signals.ts` tot 24 augustus in geen enkele
   * taalpoort — 53 strings per taal die niemand las. */
  it("dekt precies de vijf bestanden die Spaanse kopij dragen", () => {
    expect(BRONNEN.map(([bestand]) => bestand)).toEqual([
      "lib/i18n/dict.ts",
      "lib/sectors.ts",
      "lib/ventures.ts",
      "lib/signals.ts",
      "lib/insights.ts",
    ]);
  });
});
