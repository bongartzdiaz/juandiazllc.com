/* De lekkage-scan — zestien ja/nee-vragen, vier blokken, drie lekken eruit.
 *
 * Dit bestand draagt de vragen en het scoremechanisme, verder niets. De UI
 * staat in components/LekkageScan.tsx, de pagina in
 * app/[locale]/tools/lekkage-scan/page.tsx. Zo is het rekenwerk te testen
 * zonder een component te renderen.
 *
 * De onderbouwing staat in docs/lead-magnet.md — waarom dit formaat, waarom
 * alleen Nederlands, en waar elke uitspraak vandaan komt. Een gate in
 * lekkage-scan.test.ts eist dat elke vraag hieronder ook letterlijk in dat
 * document staat, want anders lopen de twee uit elkaar zonder dat iemand het
 * merkt — precies wat er met public/llms.txt gebeurde (#199).
 *
 * GEEN BEDRAGEN. Wat een "nee" kost staat in woorden. Een voorspelde besparing
 * zou een verzonnen cijfer zijn en docs/claims.md is de enige bron die zoiets
 * mag dragen. */

export type BlokId = "A" | "B" | "C" | "D";

/** Vaste volgorde. Breekt gelijkspel in de uitslag — zie `scoor()`. */
export const VOLGORDE: readonly BlokId[] = ["A", "B", "C", "D"] as const;

export type Blok = {
  id: BlokId;
  naam: string;
  /** Welke bevestigde uitkomst dit blok spiegelt. Bron: docs/claims.md. */
  spiegelt: string;
  /** Hoe het lek in de uitslag heet. */
  lek: string;
};

export const BLOKKEN: readonly Blok[] = [
  {
    id: "A",
    naam: "Overdracht",
    spiegelt: "3,2× pijplijnsnelheid, toen buitendienst en kantoor dezelfde dealstatus deelden",
    lek: "De status leeft in hoofden",
  },
  {
    id: "B",
    naam: "Reactietijd",
    spiegelt: "−61% tijd-tot-offerte, na automatisering van intake → schouw → voorstel",
    lek: "Je weet niet waar de tijd blijft",
  },
  {
    id: "C",
    naam: "Dubbele invoer",
    spiegelt: "+38% lead-naar-gesprek, na vier tools vervangen door één CRM plus een WhatsApp-flow",
    lek: "Hetzelfde feit wordt meermaals getypt",
  },
  {
    id: "D",
    naam: "Stapelkosten",
    spiegelt: "€0 extra SaaS-uitgaven — de uitgezette tools financierden de herbouw",
    lek: "Je betaalt voor overlap",
  },
] as const;

/* Een grens met een bron. Alleen `docs/claims.md` mag hem dragen, en
 * `lekkage-scan.test.ts` controleert dat de waarde daar ook werkelijk staat.
 *
 * Er is er precies één, en dat is opzet. "Langer dan 15 minuten", "meer dan 5
 * uur per week" en "langer dan 48 uur" zijn alle drie voorgesteld en alle drie
 * afgevallen: geen van de drie heeft een bron. Een verzonnen drempel is
 * schadelijker dan geen drempel, want een lezer neemt hem over. */
export type Grens = {
  /** In de eenheid van de meting. */
  waarde: number;
  /** Wat er boven die waarde bekend is. In woorden, met de beperking erbij. */
  duiding: string;
  /** Bronvermelding zoals hij op de pagina komt te staan. */
  bron: string;
};

/* Een meting laat de bezoeker een getal opzoeken in zijn eigen administratie
 * in plaats van het in te schatten.
 *
 * WAAROM DIT ERBIJ IS GEKOMEN. Zestien ja/nee-vragen leveren een mening op.
 * Een geteld getal levert een feit op, en een feit dat de lezer zélf heeft
 * geproduceerd is het enige cijfer in dit hele instrument dat over zijn bedrijf
 * gaat. De ja/nee blijft staan: die draagt de uitslag, want een leeg veld mag
 * de scan niet blokkeren. */
export type Meting = {
  /** Hoe je aan het getal komt. Geen schatting, een telling. */
  opdracht: string;
  /** Label boven het invulveld. */
  label: string;
  /** Eenheid achter het veld. */
  eenheid: string;
  /** Alleen aanwezig als er een bron voor bestaat. */
  grens?: Grens;
};

export type Vraag = {
  id: string;
  blok: BlokId;
  vraag: string;
  /** Wat een lek-antwoord kost. In woorden, nooit in een getal. */
  kost: string;
  /** Bij deze vraag telt "ja" als lek in plaats van "nee". */
  omgekeerd?: true;
  /** Optioneel: laat de bezoeker het werkelijke getal opzoeken. */
  meting?: Meting;
};

export const VRAGEN: readonly Vraag[] = [
  {
    id: "A1",
    blok: "A",
    vraag: "Kan je buitendienst de status van een lopende aanvraag zien zonder iemand te bellen?",
    kost: "Bij nee reist elke statuswijziging via een mens. Elke overdracht is een moment waarop hij kan blijven liggen, en je ziet niet welke dat was.",
  },
  {
    id: "A2",
    blok: "A",
    vraag: "Weet kantoor binnen een uur dat een schouw is afgerond?",
    kost: "Bij nee begint de offerte pas als iemand het toevallig hoort. Die wachttijd staat nergens genoteerd, dus hij wordt ook nooit korter.",
  },
  {
    id: "A3",
    blok: "A",
    vraag: "Staat de actuele status van een deal op één plek, en niet in meerdere systemen naast elkaar?",
    kost: "Bij meerdere is er geen antwoord op \"hoe staat het ervoor\", alleen meningen. Wie gelijk had blijkt pas bij de klacht.",
  },
  {
    id: "A4",
    blok: "A",
    vraag: "Kan een collega de lopende aanvragen van een zieke monteur overnemen zonder overdrachtsgesprek?",
    kost: "Bij nee zit de status in een hoofd. Ziekte, vakantie en vertrek zijn dan hetzelfde risico met een andere naam.",
  },
  {
    id: "B1",
    blok: "B",
    vraag: "Weet je hoeveel uur er gemiddeld tussen aanvraag en offerte zit?",
    kost: "Bij nee kun je die tijd niet verkorten, want je zou de verbetering niet zien.",
    meting: {
      opdracht:
        "Pak je laatste vijf verstuurde offertes. Tel per offerte de werkdagen tussen het eerste klantcontact en het moment dat hij de deur uit ging.",
      label: "Gemiddeld aantal werkdagen tot de offerte",
      eenheid: "werkdagen",
      // Geen grens. Er bestaat geen bron voor een doorlooptijd die "goed" is, en
      // een verzonnen drempel is erger dan geen drempel.
    },
  },
  {
    id: "B2",
    blok: "B",
    vraag: "Gaat er een offerte de deur uit zonder dat iemand gegevens overtypt uit een ander systeem?",
    kost: "Bij nee betaal je twee keer: de tijd van het overtypen, en de fouten die erin sluipen en pas bij de klant opvallen.",
  },
  {
    id: "B3",
    blok: "B",
    vraag: "Krijgt een aanvrager binnen 24 uur een reactie, ook in een weekend of een vakantieweek?",
    kost: "Bij nee is je reactietijd een functie van wie er toevallig werkt. De aanvrager belt ondertussen de volgende.",
    meting: {
      opdracht:
        "Zoek je laatste tien aanvragen op die buiten kantooruren binnenkwamen. Tel de uren tot het eerste inhoudelijke antwoord van een mens — een ontvangstbevestiging telt niet mee.",
      label: "Gemiddelde uren tot het eerste inhoudelijke antwoord",
      eenheid: "uur",
      grens: {
        waarde: 1,
        duiding:
          "Boven een uur wordt kwalificeren aantoonbaar moeilijker: bedrijven die binnen het uur reageerden kwalificeerden bijna zeven keer zo vaak een lead als bedrijven die er langer over deden. Dat gaat over kwalificeren en niet over winnen, en het is Amerikaans onderzoek, geen Nederlandse norm.",
        bron: "Harvard Business Review, 2011 — audit van 2.241 bedrijven",
      },
    },
  },
  {
    id: "B4",
    blok: "B",
    vraag: "Kun je zien wélke stap in het traject de meeste tijd kost?",
    kost: "Bij nee verbeter je op gevoel, en gevoel wijst naar de stap die het luidst klaagt — zelden naar de stap die het langst duurt.",
  },
  {
    id: "B5",
    blok: "B",
    vraag: "Kun je een klant binnen een week een tekening of calculatie laten zien, ook als de collega die dat maakt er niet is?",
    kost: "Bij nee is je doorlooptijd de agenda van één persoon. De klant merkt dat als stilte, en jij merkt het pas als hij niet terugbelt.",
  },
  {
    id: "C1",
    blok: "C",
    vraag: "Wordt de naam en het adres van een nieuwe aanvraag maar één keer getypt?",
    kost: "Bij nee bestaan er meteen twee versies van dezelfde klant, en niets bepaalt welke de echte is.",
  },
  {
    id: "C2",
    blok: "C",
    vraag: "Staan WhatsApp-gesprekken met klanten ergens waar een collega ze terugvindt?",
    kost: "Bij nee staat de klantgeschiedenis op een privételefoon. Bij vertrek gaat hij mee de deur uit.",
  },
  {
    id: "C3",
    blok: "C",
    vraag: "Komt een aanvraag via je website automatisch terecht in het systeem waar je werkt?",
    kost: "Bij nee bestaat de aanvraag pas zodra iemand hem overneemt, en op die stap staat geen alarm.",
  },
  {
    id: "C4",
    blok: "C",
    vraag: "Weet je bij elke lead waar hij vandaan kwam?",
    kost: "Bij nee is elke uitspraak over wat werkt een gok. Je stopt dan met het kanaal dat het minst luid is, niet met het kanaal dat het minst oplevert.",
  },
  {
    id: "D1",
    blok: "D",
    vraag: "Weet je uit je hoofd hoeveel softwareabonnementen je hebt en wat ze samen per maand kosten?",
    kost: "Bij nee groeit die stapel per losse beslissing, en niemand neemt ooit het besluit om hem te laten groeien.",
  },
  {
    id: "D2",
    blok: "D",
    // Omgekeerd met opzet. Vijftien vragen waarbij "nee" altijd slecht is, vult
    // iemand op de automatische piloot in — dan meet je aandacht, niet de stack.
    omgekeerd: true,
    vraag: "Is er een tool waarvoor je betaalt en die minder dan één keer per week door iemand geopend wordt?",
    kost: "Bij ja betaal je voor een gewoonte die niemand meer heeft. Dat is de goedkoopste besparing die er is, en de makkelijkste om te vergeten.",
  },
  {
    id: "D3",
    blok: "D",
    vraag: "Kun je bij het vertrek van een medewerker binnen een dag al zijn toegangen intrekken?",
    kost: "Bij nee is je stapel ook een beveiligingsprobleem, niet alleen een kostenpost.",
  },
] as const;

/* Het aantal vragen als woord, afgeleid in plaats van overgeschreven.
 *
 * WAAROM DIT ER STAAT. Tot 2026-09-01 stond "Vijftien" hardgecodeerd op zes
 * plekken: twee in de pagina, drie in het component, één in de callout — plus
 * `docs/partners.md`, dat het overnam in een tekst die naar partners gaat. Er
 * waren er toen al zestien. De telling dreef weg toen B5 erbij kwam, en de
 * poort die dit bewaakte las alleen `docs/lead-magnet.md` — dus die bleef
 * groen terwijl de bezoeker een verkeerd getal las.
 *
 * Eén bron is hier goedkoper dan een poort die zes plekken bewaakt: wie een
 * vraag toevoegt hoeft nu geen kopij bij te werken. De poort in
 * lekkage-scan.test.ts leest deze constante en de drie kopijbestanden, zodat
 * een teruggezet hardgecodeerd telwoord alsnog omvalt.
 *
 * Gooit bij een aantal buiten de tabel. Luid falen in CI is beter dan
 * "undefined vragen" op een levende pagina. */
const TELWOORD_NL: Readonly<Record<number, string>> = {
  12: "twaalf",
  13: "dertien",
  14: "veertien",
  15: "vijftien",
  16: "zestien",
  17: "zeventien",
  18: "achttien",
  19: "negentien",
  20: "twintig",
};

export function telwoordNL(n: number): string {
  const woord = TELWOORD_NL[n];
  if (!woord) throw new Error(`telwoordNL: vul TELWOORD_NL aan voor ${n}`);
  return woord;
}

/** Kleine letter, voor midden in een zin. */
export const AANTAL_WOORD = telwoordNL(VRAGEN.length);

/** Hoofdletter, voor aan het begin van een zin. */
export const AANTAL_WOORD_HOOFD = AANTAL_WOORD[0].toUpperCase() + AANTAL_WOORD.slice(1);

/** Antwoord per vraag-id. `true` = ja. Ontbrekend = nog niet beantwoord. */
export type Antwoorden = Readonly<Record<string, boolean | undefined>>;

export type Lek = {
  blok: BlokId;
  naam: string;
  lek: string;
  /** Aantal lek-antwoorden in dit blok. */
  aantal: number;
  /** Aantal vragen in dit blok. Niet elk blok is even groot — zie `scoor()`. */
  totaal: number;
  /** `aantal / totaal`. Hierop wordt gerangschikt, niet op `aantal`. */
  aandeel: number;
  /** De vragen die lekten, in bronvolgorde. */
  vragen: Vraag[];
};

/** Lekt dit antwoord? Ontbrekend telt niet als lek — zie `alleBeantwoord()`. */
export function lekt(vraag: Vraag, antwoord: boolean | undefined): boolean {
  if (antwoord === undefined) return false;
  return vraag.omgekeerd ? antwoord === true : antwoord === false;
}

export function alleBeantwoord(antwoorden: Antwoorden): boolean {
  return VRAGEN.every((v) => antwoorden[v.id] !== undefined);
}

/* De uitslag: de drie blokken die het meest lekken, meeste eerst.
 *
 * OP AANDEEL, NIET OP AANTAL — en dat is sinds B5 een echt verschil. Zolang elk
 * blok even veel vragen droeg waren die twee hetzelfde. Blok B heeft er nu vijf
 * en de rest vier, en dan wint tellen automatisch het grootste blok: drie lekken
 * van vijf is minder erg dan drie van vier, maar een teller ziet twee keer drie.
 * Zonder deze wijziging zou een vraag toevoegen het blok stilzwijgend zwaarder
 * hebben gemaakt.
 *
 * Gelijkspel breekt eerst op aantal en daarna op VOLGORDE (A→B→C→D). Dat
 * laatste is een oordeel en geen meting — er is geen bewijs dat overdracht
 * zwaarder weegt dan stapelkosten. Het staat er zodat de uitslag
 * reproduceerbaar is in plaats van willekeurig, en de comparator doet het
 * expliciet in plaats van te leunen op de stabiliteit van Array#sort.
 *
 * Blokken zonder lek vallen weg. Bij nul lekken is het antwoord een lege lijst,
 * en dat hoort ook zo: een scan die altijd iets vindt is een verkoopinstrument
 * en geen diagnose. */
export function scoor(antwoorden: Antwoorden, max = 3): Lek[] {
  const rang = (b: BlokId) => VOLGORDE.indexOf(b);

  return BLOKKEN.map((blok) => {
    const totaal = VRAGEN.filter((v) => v.blok === blok.id).length;
    const vragen = VRAGEN.filter((v) => v.blok === blok.id && lekt(v, antwoorden[v.id]));
    return {
      blok: blok.id,
      naam: blok.naam,
      lek: blok.lek,
      aantal: vragen.length,
      totaal,
      aandeel: vragen.length / totaal,
      vragen,
    };
  })
    .filter((l) => l.aantal > 0)
    .sort(
      (a, b) =>
        b.aandeel - a.aandeel || b.aantal - a.aantal || rang(a.blok) - rang(b.blok),
    )
    .slice(0, max);
}

/* ---------------------------------------------------------------------------
 * De metingen
 * ------------------------------------------------------------------------ */

/** Ingevulde metingen per vraag-id. Leeg mag: de scan werkt zonder. */
export type Metingen = Readonly<Record<string, number | undefined>>;

export const MET_METING: readonly Vraag[] = VRAGEN.filter((v) => v.meting);

export type MetingUitslag = {
  vraag: Vraag;
  meting: Meting;
  waarde: number;
  /** Alleen bekend als de vraag een grens draagt. */
  bovenGrens?: boolean;
};

/* Wat de bezoeker terugkrijgt voor het getal dat hij zelf heeft opgezocht.
 *
 * Een niet-ingevuld veld levert niets op — geen nul, geen aanname. Dat is het
 * verschil tussen "gemeten" en "leeg gelaten", en de uitslag mag die twee niet
 * door elkaar halen. Een negatieve of onmogelijke invoer valt om dezelfde reden
 * weg: dan is er niet gemeten maar getypt. */
export function duidMetingen(metingen: Metingen): MetingUitslag[] {
  const uit: MetingUitslag[] = [];
  for (const vraag of MET_METING) {
    const waarde = metingen[vraag.id];
    if (waarde === undefined || !Number.isFinite(waarde) || waarde < 0) continue;
    const meting = vraag.meting!;
    uit.push({
      vraag,
      meting,
      waarde,
      ...(meting.grens ? { bovenGrens: waarde > meting.grens.waarde } : {}),
    });
  }
  return uit;
}
