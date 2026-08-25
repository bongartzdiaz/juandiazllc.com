import { describe, it, expect } from "vitest";
import { DICT } from "./dict";
import { SECTORS } from "../sectors";
import { VENTURES } from "../ventures";
import { POSTS } from "../insights";
import { SIGNALS } from "../signals";
import { faqStrings } from "../seo/faqs";

/* Vier poorten op het Spaanse register.
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
 *   4. De Duitse getuige. Laag 3 mist elke zin waar het Nederlands een
 *      imperatief gebruikt: "Kies een tijdslot" spreekt de lezer aan zonder
 *      je/jij/jouw, dus zo'n sleutel komt de gekoppelde regel niet eens
 *      binnen. Het Duits legt datzelfde feit wel vast, want de
 *      beleefdheidsvorm draagt daar een hoofdletter: Sie, Ihnen, Ihr(e).
 *
 *      De dubbelzinnigheid is dat Sie/Ihnen ook "zij/hen" betekenen. Die is
 *      op te lossen met de zinsgrens — aan het begin van een zin draagt elk
 *      woord een hoofdletter, dus alleen een treffer MIDDEN in een zin telt.
 *      Gemeten op 25 augustus: van de tweeëntwintig treffers waren er precies
 *      vier zinsbeginnend, en alle vier betekenden ze "zij/hen". De
 *      grensregel haalt die vier eruit zonder een enkele uitzondering.
 *
 * WAT DEZE POORT NIET ZIET. Of het Spaans klópt — daar is een lezer voor.
 * Een usted-zin waar het Nederlands de lezer niet aanspreekt. En kopij die
 * via een prop van een oudercomponent binnenkomt.
 *
 * Alle vier lezen de geëxporteerde data en niet de bestandstekst, zodat dit
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
  inténtelo: "usted-imperatief met clitic; de tú-vorm inténtalo staat in form.err.network.",
  contáctenos: "usted-imperatief met clitic; de tú-vorm contáctanos staat in de sector-FAQ.",
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
  // Deze vier stonden tot 24 augustus NIET in de lijst, waardoor vier sleutels
  // die de lezer wél aanspreken als "onpersoonlijk" waren vrijgesteld — en
  // daarmee buiten de hele gekoppelde regel vielen. Elk is ondubbelzinnig tú:
  // de derde persoon luidt ve / use / supera / sáltese.
  "ves", "uses", "superas", "sáltate",
  // en de drie vormen uit de omzetting van 24 augustus
  "firmes", "comprometas", "reserves",
  // uit lib/seo/faqs.ts, dat pas op 24 augustus in deze poort kwam
  "has", "recibes", "terminas", "tuyos",
  // vosotros — de informele MEERVOUDSVORM. De FAQ-vragen zijn de lezer die het
  // bedrijf aanspreekt ("werken jullie met…"), dus hetzelfde register en een
  // ander getal. In het schiereiland-Spaans dat deze site schrijft is ustedes
  // daar juist de formele vorm, en vier sector-FAQ's stonden daar tot vandaag
  // in terwijl HOME, CONTACT en SERVICES in hetzelfde bestand vosotros zeiden.
  "trabajáis", "construís", "configuráis", "estáis", "respondéis", "firmáis",
  "podéis", "integráis", "integraros", "contrataros",
  // let op: "pruebas" is ook een zelfstandig naamwoord. Hier staat het als
  // werkwoord ("Pruebas bajo carga", nl "Je test onder ..."). Het marker-zijn
  // maakt de poort op dat punt iets toegeeflijker, niet valser.
  // TÚ-IMPERATIEVEN. Deze ontbraken allemaal, en dat was het grootste gat in
  // deze poort: een imperatief is de meest voorkomende manier waarop Spaanse
  // UI-kopij de lezer aanspreekt, en laag 3 kon zo'n sleutel niet eens
  // bereiken. Veertien sleutels stonden op 25 augustus voor élke laag
  // onzichtbaar — schreef iemand `Elige` om naar `Elija`, dan meldde niets iets.
  //
  // Hier stond "dertien". Dat was de telling van vóór de veertiende vondst:
  // five-phases.body[9].text kwam pas boven nadat deze markers erin stonden,
  // en is nooit bij de dertien opgeteld. Nagemeten op productie, 25 augustus:
  // veertien. Af te leiden door de treffers van deSpreektAan te houden
  // waarvan elke gematchte marker uit dit blok komt.
  //
  // Sommige zijn ook derde persoon (él elige, él trae, él toca). Dat mag hier,
  // en het mag in NIET_MEER juist niet. De lijsten zijn asymmetrisch: een
  // marker erbij maakt de poort TOEGEEFLIJKER — het ergste geval is een
  // gemiste treffer. Een verbod erbij maakt hem strenger, en het ergste geval
  // daar is vals alarm op correcte kopij, waarna de poort binnen een week
  // wordt uitgezet. Zelfde afweging als bij "pruebas" hierboven.
  "haz", "elige", "introduce", "trae", "sal", "toca", "cierra",
  // "entrega" is ook zelfstandig naamwoord (levering). Zelfde afweging.
  "entrega",
  "compra", "construye", "parte",
  // met aangehecht voornaamwoord — ondubbelzinnig tú
  "inténtalo", "cuéntame", "contáctanos", "escríbeme",
  "pruebas",
];

/* Eerste persoon meervoud die de lezer INSLUIT: "laten we ...". Dat is geen
 * tú-vorm en geen usted-vorm maar een derde manier om de lezer erbij te
 * betrekken, en hem tussen de tú-markers zetten zou een onwaarheid vastleggen
 * op precies de plek waar een volgende sessie hem vertrouwt. Zelfde werking,
 * eerlijke naam. */
const WIJ_INCLUSIEF: Record<string, string> = {
  dibujemos: 'insluitend "laten we tekenen" — de lezer zit in het onderwerp.',
  empecemos: 'insluitend "laten we beginnen".',
};

/* Sleutels waar het Nederlands de lezer aanspreekt en het Spaans bewust
 * niemand aanspreekt. Elk met de constructie erbij, want zonder reden wordt
 * zo'n lijst een plek om een echte usted-zin in te verstoppen.
 *
 * Deze lijst stond op dertien en staat op drie. Zes sleutels zijn omgezet naar
 * tú omdat en én nl de lezer daar aanspreken en alleen het Spaans niet; vier
 * spraken de lezer altijd al aan en stonden hier alleen omdat hun werkwoord
 * niet in TU_MARKERS stond. Wat overblijft is Spaans dat om zijn eigen reden
 * niemand aanspreekt — en bij elk daarvan staat welke taal de afwijkende is. */
const ONPERSOONLIJK: Record<string, string> = {
  "process.1.body":
    'infinitief als processtap: "Ver lo que realmente está pasando antes de tocar nada". ' +
    "Het Engels zegt 'before touching anything' zonder onderwerp en het " +
    "Spaans 'antes de tocar nada'; nl ('voordat je iets aanraakt') en de " +
    "('bevor Sie etwas anfassen') spreken de lezer allebei wél aan. Twee " +
    "getuigen dus, niet één — de eerdere lezing dat alleen het Nederlands " +
    "dat deed was onjuist, en niet te controleren zolang er geen Duitse laag " +
    "was. De infinitief is de Spaanse vorm voor een processtap.",
  "help-mij-besparen.summary":
    'derde persoon over het publiek: "que muestra a los hogares neerlandeses". ' +
    "De lezer is hier het onderwerp van de zin niet — de tool is dat, en de " +
    "huishoudens zijn het lijdend voorwerp.",
  "five-phases.excerpt":
    'derde persoon: "Los jefes de obra saben algo". De zin gaat over ' +
    "bouwmanagers en niet over de lezer; en en nl doen daar hetzelfde.",
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
  ["lib/seo/faqs.ts", faqStrings("es"), 50],
];

/** Uitzonderingen waarvan het aangehaalde fragment niet in de Spaanse zin
 *  staat. Losse functie zodat de positieve controle er dezelfde weg door gaat
 *  als de echte lijst. */
function verkeerdGeciteerd(
  lijst: Record<string, string>,
  es: Map<string, string>,
): string[] {
  return Object.entries(lijst)
    .map(([k, reden]) => [k, reden.match(/"([^"]+)"/)?.[1] ?? ""] as const)
    .filter(([k, fragment]) => fragment !== "" && !(es.get(k) ?? "").includes(fragment))
    .map(([k, fragment]) => `${k} citeert "${fragment}" maar dat staat er niet`);
}

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

/** Spreekt de Spaanse zin de lezer aan — met tú of insluitend wij? Eén
 *  oordeel voor laag 3 en laag 4, want twee kopieën lopen uiteen en dan
 *  bewaakt de zwakste. */
function esSpreektAan(es: string): boolean {
  const ws = woorden(es);
  return ws.some(
    (w, i) =>
      /* `se` + derde persoon is de onpersoonlijke of passieve constructie en
         nooit een imperatief — een tú-imperatief neemt -te, niet -se. Zonder
         deze regel telt "un edificio no se entrega a ojo" als aanspreking, en
         dan onderdrukt de marker `entrega` een echte treffer in
         five-phases.excerpt. Gevangen door de verouderingscontrole hieronder,
         binnen één run na het toevoegen van die marker. */
      ws[i - 1] !== "se" &&
      (TU_MARKERS.includes(w) || w in WIJ_INCLUSIEF),
  );
}

/** Elk sleutelpad waar nl informeel aanspreekt en es niemand aanspreekt. */
function ongepaard(paren: Array<[pad: string, nl: string, es: string]>): string[] {
  return paren
    .filter(([, nl]) => woorden(nl).some((w) => NL_INFORMEEL.includes(w)))
    .filter(([, , es]) => !esSpreektAan(es))
    .map(([pad, , es]) => `${pad} → "${es.slice(0, 70)}"`);
}

/** Spreekt de Duitse zin de lezer aan met de beleefdheidsvorm, MIDDEN in een
 *  zin? De hoofdletter onderscheidt Sie/Ihr van "zij/hen", en aan het begin
 *  van een zin draagt elk woord er een — daar is het onderscheid dus weg.
 *  Geen lookbehind: een gewone lus over de treffers leest makkelijker en werkt
 *  overal hetzelfde. */
function deSpreektAan(zin: string): boolean {
  const kaal = zin.replace(/<[^>]*>/g, " ");
  const re = /(?:Sie|Ihnen|Ihr(?:e|em|en|er|es)?)(?![A-Za-z\u00c0-\u00ff])/g;
  for (let m = re.exec(kaal); m; m = re.exec(kaal)) {
    // voorafgegaan door witruimte, en het teken daarvóór sluit geen zin af
    if (/[^.!?:\s]\s+$/.test(kaal.slice(0, m.index))) return true;
  }
  return false;
}

/** Elk sleutelpad waar het Duits de lezer middenin een zin aanspreekt en
 *  het Spaans niemand aanspreekt. */
function ongepaardDuits(paren: Array<[pad: string, de: string, es: string]>): string[] {
  return paren
    .filter(([, de]) => deSpreektAan(de))
    .filter(([, , es]) => !esSpreektAan(es))
    .map(([pad, , es]) => `${pad} → "${es.slice(0, 70)}"`);
}

/* De koppeling per bron. Insights doet niet mee: de Spaanse artikelen zijn
 * marktspecifiek en hebben geen Nederlandse tegenhanger onder dezelfde slug,
 * dus daar valt niets te paren. Voor die bron doet laag 1 het werk.
 *
 * Eén opbouw voor drie talen, geen drie lijsten naast elkaar. Laag 3 leest de
 * Nederlandse kant en laag 4 de Duitse; zouden die elk hun eigen opbouw
 * krijgen, dan lopen ze uiteen en bewaakt de zwakste. */
function kopij(taal: "nl" | "de" | "es"): Map<string, string> {
  const m = new Map<string, string>();
  const zet = (rs: Herkomst[]) => rs.forEach(([k, v]) => m.set(k, v));
  zet(Object.entries(DICT[taal]));
  zet(
    [...SECTORS, ...VENTURES, ...SIGNALS].flatMap((r) =>
      // de drie typen dragen elk een eigen L10n-vorm, dus de unie is niet
      // met een variabele sleutel te indexeren; plat() neemt toch unknown
      plat((r.i18n as Record<string, unknown> | undefined)?.[taal] ?? {}, r.slug),
    ),
  );
  /* Op pad gekoppeld en niet op index: een sector die in één taal een vraag
     mist, verschuift dan niet stilzwijgend alle antwoorden erachter. */
  zet(faqStrings(taal));
  return m;
}

const ES_KOPIJ = kopij("es");

/** Elke sleutel van `bron`, met de Spaanse tegenhanger ernaast. */
function koppel(bron: Map<string, string>): Array<[string, string, string]> {
  return [...bron].map(([pad, v]) => [pad, v, ES_KOPIJ.get(pad) ?? ""]);
}

const GEKOPPELD: Array<[pad: string, nl: string, es: string]> = koppel(kopij("nl"));
const GEKOPPELD_DE: Array<[pad: string, de: string, es: string]> = koppel(kopij("de"));

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

  it("telt een imperatief wel en dezelfde vorm achter `se` niet", () => {
    /* De tú-imperatieven in TU_MARKERS zijn deels ook derde persoon. De
       onderscheidende constructie is `se`; zonder die regel is elke passieve
       zin een aanspreking. */
    expect(esSpreektAan("Entrega los sistemas que desbloquean la cifra.")).toBe(true);
    expect(esSpreektAan("Un edificio no se entrega a ojo.")).toBe(false);
    expect(esSpreektAan("El método se traslada limpiamente.")).toBe(false);
    expect(esSpreektAan("Dibujemos el plano juntos.")).toBe(true);
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
    /* Beide lagen, want een uitzondering kan door laag 4 gedragen worden en
       niet door laag 3 — process.1.body is precies dat geval. Alleen laag 3
       lezen zou hem dan als "niet meer waar" aanmerken en de vrijstelling
       weghalen die hem overeind houdt. */
    const gemeten = new Set(
      [...ongepaard(GEKOPPELD), ...ongepaardDuits(GEKOPPELD_DE)].map(
        (r) => r.split(" → ")[0],
      ),
    );
    const verouderd = Object.keys(ONPERSOONLIJK).filter((k) => !gemeten.has(k));
    expect(
      verouderd,
      "deze sleutels staan als onpersoonlijk genoteerd maar zijn dat niet " +
        "meer — haal ze uit ONPERSOONLIJK in plaats van de lijst te laten staan",
    ).toEqual([]);
  });

  it("citeert in elke uitzondering een fragment dat er werkelijk staat", () => {
    /* Een reden mag een citaat lijken en het niet zijn. `process.1.body` stond
     * hier met "Ver lo que está pasando" terwijl de kopij "Ver lo que REALMENTE
     * está pasando" zegt — dicht genoeg om over te lezen, en zo raakt een
     * uitzondering los van de zin die hij verdedigt.
     *
     * Alleen het EERSTE fragment tussen aanhalingstekens telt: dat is de
     * aangehaalde Spaanse constructie. Wat erachter komt mag een toelichting
     * in een andere taal zijn. */
    const es = new Map(GEKOPPELD.map(([p, , v]) => [p, v]));
    expect(verkeerdGeciteerd(ONPERSOONLIJK, es)).toEqual([]);

    /* Positieve controle: dezelfde functie moet een verzonnen citaat betrappen,
       anders is een lege lijst niet te onderscheiden van een kapotte check. */
    const proef = new Map([["p", "Un edificio no se entrega a ojo."]]);
    expect(verkeerdGeciteerd({ p: 'onpersoonlijk: "un edificio SE entrega".' }, proef)).toHaveLength(1);
    expect(verkeerdGeciteerd({ p: 'onpersoonlijk: "no se entrega a ojo".' }, proef)).toEqual([]);

    // en elke uitzondering draagt daadwerkelijk een citaat om te controleren
    expect(Object.entries(ONPERSOONLIJK).filter(([, r]) => !/"[^"]+"/.test(r))).toEqual([]);
  });

  it("noemt in elke uitzondering welke constructie het Spaans gebruikt", () => {
    const zonder = Object.entries(ONPERSOONLIJK).filter(([, r]) => r.trim().length < 20);
    expect(zonder.map(([k]) => k)).toEqual([]);
    expect(Object.keys(ONPERSOONLIJK).every((k) => paden.has(k))).toBe(true);
  });
});

/* ── laag 4: de Duitse getuige ───────────────────────────────────── */

describe("waar het Duits de lezer aanspreekt, doet het Spaans dat ook", () => {
  it("leest werkelijk beide talen", () => {
    expect(GEKOPPELD_DE.length).toBeGreaterThan(700);
    expect(GEKOPPELD_DE.some(([, de, es]) => de && es)).toBe(true);
    // en de getuige vindt daadwerkelijk iets in die kopij
    expect(GEKOPPELD_DE.filter(([, de]) => deSpreektAan(de)).length).toBeGreaterThan(5);
  });

  it("telt Sie en Ihr alleen midden in een zin", () => {
    /* Zonder deze zes is elke groene uitkomst hieronder ook te verklaren door
       een getuige die niets ziet, of door één die overal op afgaat. */
    expect(deSpreektAan("Wir zeigen Ihnen die Zahlen.")).toBe(true);
    expect(deSpreektAan("Überspringen Sie eine Phase und es leckt.")).toBe(true);
    expect(deSpreektAan("Sie sehen die Zahlen.")).toBe(false);
    expect(deSpreektAan("Das ist es. Sie sehen es.")).toBe(false);
    expect(deSpreektAan("Wir wissen, wenn sie kommen.")).toBe(false);
    expect(deSpreektAan("Die Zahlen liegen bereit.")).toBe(false);
  });

  it("gaat af op een zin die de lezer met usted aanspreekt", () => {
    expect(ongepaardDuits([["proef", "Lassen Sie Ihre Daten da", "Deje sus datos"]]))
      .toHaveLength(1);
    expect(ongepaardDuits([["proef", "Lassen Sie Ihre Daten da", "Deja tus datos"]]))
      .toEqual([]);
  });

  it("laat geen sleutel over buiten de uitzonderingen", () => {
    const over = ongepaardDuits(GEKOPPELD_DE).filter(
      (r) => !(r.split(" → ")[0] in ONPERSOONLIJK),
    );
    expect(
      over,
      "Het Duits spreekt de lezer hier aan en het Spaans niemand. Drie geldige " +
        "oplossingen: de zin is usted (herschrijf hem naar tú), de zin is tú met " +
        "een vorm die nog niet in TU_MARKERS staat (zet hem erbij), of het " +
        "Spaans is hier bewust onpersoonlijk (ONPERSOONLIJK, met de " +
        "constructie erbij).",
    ).toEqual([]);
  });
});

describe("de twee manieren om de lezer aan te spreken raken elkaar niet", () => {
  it("houdt de insluitende wij-vorm buiten TU_MARKERS", () => {
    /* Een wij-vorm die als tú-marker genoteerd staat legt een onwaarheid vast
       op de plek waar een volgende sessie hem vertrouwt. */
    const dubbel = Object.keys(WIJ_INCLUSIEF).filter((w) => TU_MARKERS.includes(w));
    expect(dubbel).toEqual([]);
  });

  it("noemt bij elke wij-vorm een reden", () => {
    const zonder = Object.entries(WIJ_INCLUSIEF).filter(([, r]) => r.trim().length < 20);
    expect(zonder.map(([w]) => w)).toEqual([]);
  });

  it("verbiedt geen vorm die als marker of insluitend geldt", () => {
    const fout = Object.keys(NIET_MEER).filter(
      (v) => TU_MARKERS.includes(v) || v in WIJ_INCLUSIEF,
    );
    expect(fout).toEqual([]);
  });
});

describe("de Spaanse poort leest elke kopijbron", () => {
  /* Zonder deze lijst kan een bron stil verdwijnen: de tests hierboven draaien
   * dan door over wat er nog wél in staat en de dekking krimpt zonder dat iets
   * rood wordt. Zo stond `lib/signals.ts` tot 24 augustus in geen enkele
   * taalpoort — 53 strings per taal die niemand las. */
  it("dekt precies de zes bestanden die Spaanse kopij dragen", () => {
    expect(BRONNEN.map(([bestand]) => bestand)).toEqual([
      "lib/i18n/dict.ts",
      "lib/sectors.ts",
      "lib/ventures.ts",
      "lib/signals.ts",
      "lib/insights.ts",
      "lib/seo/faqs.ts",
    ]);
  });
});
