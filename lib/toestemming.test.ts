import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "@/lib/bronscan";
import { DICT, LOCALES } from "@/lib/i18n/dict";
import {
  TOESTEMMING_VERSIE,
  TOESTEMMING_SLEUTEL,
  TOESTEMMING_EVENT,
  leesToestemming,
  schrijfToestemming,
  wisToestemming,
} from "@/lib/toestemming";

/* Deze poort bestaat omdat het defect hier juridisch is en niet functioneel.
   GA4 zet `_ga` en `_ga_<container>`. Laadt die tag zonder toestemming, dan
   werkt alles precies zoals bedoeld, gaat er niets stuk, en is de site in
   overtreding van ePrivacy art. 5(3) / Telecomwet 11.7a -- terwijl de eigen
   privacypagina in vier talen belooft dat er geen analytics-cookies zijn.
   Een poort is de enige plek waar dat luid kan worden.

   Twee lagen die elkaar niet overlappen:

     de opslaglaag   module-import, echte functies, echte uitkomsten
     de bedrading    tekstscan -- het defect zou een `laadGa4()` zijn die
                     NIET achter de ja-controle staat, en een module-import
                     kan een ontbrekende bewaking per definitie niet zien

   Wat deze poort NIET bewaakt: of Google zich aan zijn eigen vlaggen houdt,
   en of de banner er visueel goed uitziet. Het eerste is niet meetbaar vanaf
   hier, het tweede hoort in een browsermeting. */

const WORTEL = join(__dirname, "..");
const BANNER = join(WORTEL, "components", "Toestemming.tsx");
const KNOP = join(WORTEL, "components", "ToestemmingKnop.tsx");

function bron(pad: string): string {
  return zonderCommentaar(readFileSync(pad, "utf8"));
}

/* ── laag 1: de opslag ─────────────────────────────────────────────────── */

type NepVenster = {
  localStorage: {
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
    removeItem: (k: string) => void;
  };
  dispatchEvent: (e: Event) => boolean;
};

let echteVenster: unknown;

function zetVenster(opslag: Map<string, string>, gooit = false): Event[] {
  const events: Event[] = [];
  const venster: NepVenster = {
    localStorage: {
      getItem: (k) => {
        if (gooit) throw new Error("opslag geblokkeerd");
        return opslag.has(k) ? (opslag.get(k) as string) : null;
      },
      setItem: (k, v) => {
        if (gooit) throw new Error("opslag geblokkeerd");
        opslag.set(k, v);
      },
      removeItem: (k) => {
        if (gooit) throw new Error("opslag geblokkeerd");
        opslag.delete(k);
      },
    },
    dispatchEvent: (e) => {
      events.push(e);
      return true;
    },
  };
  echteVenster = (globalThis as Record<string, unknown>).window;
  (globalThis as Record<string, unknown>).window = venster;
  return events;
}

afterEach(() => {
  if (echteVenster === undefined) {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    (globalThis as Record<string, unknown>).window = echteVenster;
  }
  echteVenster = undefined;
});

describe("toestemming: de opslaglaag", () => {
  it("de sleutel draagt het versienummer", () => {
    expect(TOESTEMMING_SLEUTEL).toBe(`jd-toestemming-v${TOESTEMMING_VERSIE}`);
    expect(TOESTEMMING_VERSIE).toBeGreaterThanOrEqual(1);
  });

  /* Dit is het verschil tussen "nog niet gevraagd" en "nee gezegd". Ging
     `null` als `"nee"` gelden, dan verdween de banner bij de eerste bezoeker
     en werd er nooit iets gevraagd. Ging hij als `"ja"` gelden, dan laadt de
     tag ongevraagd -- dat is de overtreding zelf. */
  it("lege opslag geeft null, niet ja en niet nee", () => {
    zetVenster(new Map());
    expect(leesToestemming()).toBeNull();
  });

  it("een gezette keuze komt terug zoals hij ging", () => {
    zetVenster(new Map([[TOESTEMMING_SLEUTEL, "ja"]]));
    expect(leesToestemming()).toBe("ja");
  });

  /* Een onbekende waarde -- oude sleutel, handmatig geknoei, half
     geschreven -- mag nooit als toestemming gelden. */
  it("een onbekende waarde geldt niet als toestemming", () => {
    for (const rommel of ["yes", "true", "1", "JA", "", "nee ", "null"]) {
      zetVenster(new Map([[TOESTEMMING_SLEUTEL, rommel]]));
      expect(leesToestemming()).toBeNull();
    }
  });

  /* Privemodus, geblokkeerde opslag, quota vol. Terugvallen op `null` laat de
     banner terugkomen en houdt GA4 uit. Dat is de goede kant om op te falen:
     niet meten is herstelbaar, ongevraagd meten niet. */
  it("een gooiende opslag valt terug op null in plaats van op ja", () => {
    zetVenster(new Map([[TOESTEMMING_SLEUTEL, "ja"]]), true);
    expect(leesToestemming()).toBeNull();
  });

  it("schrijven bewaart de keuze en meldt hem", () => {
    const opslag = new Map<string, string>();
    const events = zetVenster(opslag);
    schrijfToestemming("ja");
    expect(opslag.get(TOESTEMMING_SLEUTEL)).toBe("ja");
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe(TOESTEMMING_EVENT);
    expect((events[0] as CustomEvent).detail).toBe("ja");
  });

  /* Zonder dit event werkt een keuze pas bij de volgende paginalading, en op
     een site met client-side navigatie is dat vaak nooit. Voor "ja" kost dat
     data; voor "nee" is het een intrekking die niet aankomt, en dat is AVG
     art. 7 lid 3. */
  it("schrijven meldt ook als de opslag weigert", () => {
    const events = zetVenster(new Map(), true);
    schrijfToestemming("nee");
    expect(events).toHaveLength(1);
    expect((events[0] as CustomEvent).detail).toBe("nee");
  });

  it("wissen haalt de sleutel weg en meldt null", () => {
    const opslag = new Map([[TOESTEMMING_SLEUTEL, "ja"]]);
    const events = zetVenster(opslag);
    wisToestemming();
    expect(opslag.has(TOESTEMMING_SLEUTEL)).toBe(false);
    expect((events[0] as CustomEvent).detail).toBeNull();
  });

  /* Deze functies draaien in een clientcomponent, maar de module wordt ook
     op de server geladen. Gooit hij daar, dan valt de hele pagina om. */
  it("zonder window gebeurt er niets en gooit er niets", () => {
    expect(leesToestemming()).toBeNull();
    expect(() => schrijfToestemming("ja")).not.toThrow();
    expect(() => wisToestemming()).not.toThrow();
  });
});

/* ── laag 2: de bedrading ──────────────────────────────────────────────── */

const GTM = "googletagmanager.com";

describe("toestemming: GA4 kan niet laden zonder ja", () => {
  it("de tag-URL staat op precies een plek", () => {
    const treffers = bron(BANNER).split(GTM).length - 1;
    expect(treffers).toBe(1);
  });

  /* De kernassertie. Elke aanroep van laadGa4() moet op dezelfde regel de
     ja-vergelijking dragen. Dat is bewust letterlijk: verhuist de bewaking
     naar een andere regel, dan faalt deze poort LUID in plaats van stil door
     te laten -- en luid falen op een refactor is hier de goedkope kant. */
  it("elke aanroep van laadGa4 staat achter een ja-vergelijking", () => {
    const regels = bron(BANNER)
      .split("\n")
      .filter((r) => /\blaadGa4\(\)/.test(r) && !/function\s+laadGa4/.test(r));
    expect(regels.length).toBeGreaterThan(0); // anders slaagt dit op niets
    for (const r of regels) {
      expect(r).toMatch(/===\s*"ja"/);
    }
  });

  /* Google leest ga-disable bij het VERZENDEN, niet bij het laden. Staat de
     vlag na het laden, dan kan een eerste page_view ertussendoor glippen bij
     iemand die net "nee" koos. */
  it("de uitschakelaar wordt gezet voordat er geladen wordt", () => {
    const b = bron(BANNER);
    const vlag = b.lastIndexOf("zetGa4Uitschakelaar(");
    const laad = b.lastIndexOf("laadGa4()");
    expect(vlag).toBeGreaterThan(-1);
    expect(laad).toBeGreaterThan(-1);
    expect(vlag).toBeLessThan(laad);
  });

  /* Niet stijl maar de enige injectievorm die aan BEIDE policies in proxy.ts
     voldoet. next/script zou de afgedwongen policy halen en de strikte
     report-only-canary permanent laten klagen via /api/csp-report. */
  it("injecteert met createElement, niet met next/script", () => {
    const b = bron(BANNER);
    expect(b).toContain('document.createElement("script")');
    expect(b).not.toContain("next/script");
  });

  /* Next vervangt alleen letterlijke uitdrukkingen bij het bouwen, dus
     process.env[NAAM] levert op de client undefined op. Dezelfde klasse als
     de CAL_WEBHOOK_SECRET die daardoor maanden uit .env.example bleef. */
  it("leest het tag-id letterlijk, zonder bracket-toegang", () => {
    const b = bron(BANNER);
    expect(b).toContain("process.env.NEXT_PUBLIC_GA4_ID");
    expect(b).not.toMatch(/process\.env\[/);
  });

  /* Zonder tag-id geen banner: een toestemmingsvraag stellen over iets dat
     niet bestaat is de bezoeker lastigvallen zonder reden. En met een keuze
     die al gemaakt is ook niet. */
  it("de banner toont alleen bij een gezette tag en een lege keuze", () => {
    const b = bron(BANNER);
    expect(b).toContain("if (!GA4_ID) return null");
    expect(b).toContain("if (keuze !== null) return null");
  });

  /* De intrekknop schrijft alleen de keuze weg; Toestemming.tsx luistert op
     hetzelfde event en doet alles met het script. Een tweede plek die de tag
     aanraakt is een tweede lijst die uit elkaar loopt. */
  it("de intrekknop raakt het script niet aan", () => {
    const k = bron(KNOP);
    expect(k).not.toContain(GTM);
    expect(k).not.toContain("ga-disable");
    expect(k).toContain("schrijfToestemming(");
  });

  /* Deze twee vlaggen zijn geen no-op: ze houden de data uit Google Signals
     en uit advertentiepersonalisatie, en dat is het verschil tussen een
     statistiekdoel en een advertentiedoel. Gaan ze aan, dan is dat een NIEUW
     doel en dekt een oude "ja" iets dat de bezoeker nooit zag -- dan MOET de
     versie in de sleutel omhoog. Deze poort dwingt dat af. */
  it("een advertentiedoel vergt een nieuwe sleutelversie", () => {
    const b = bron(BANNER);
    const advertentie =
      /allow_google_signals:\s*true/.test(b) ||
      /allow_ad_personalization_signals:\s*true/.test(b);
    if (advertentie) {
      expect(TOESTEMMING_VERSIE).toBeGreaterThan(1);
    } else {
      expect(b).toContain("allow_google_signals: false");
      expect(b).toContain("allow_ad_personalization_signals: false");
    }
  });

  /* De strip is dragend, niet decoratief: vier eerdere tekstscans in deze
     repo vielen om op hun eigen toelichting. Dit paar bewijst het in twee
     richtingen op een synthetische bron, zonder een echt bestand te muteren. */
  it("commentaar telt niet mee, echte code wel", () => {
    const alsCommentaar = ["const x = 1;", `// ${GTM}`, "const y = 2;"].join("\n");
    const alsCode = ["const x = 1;", `const u = "${GTM}";`].join("\n");
    expect(zonderCommentaar(alsCommentaar)).not.toContain(GTM);
    expect(zonderCommentaar(alsCode)).toContain(GTM);
  });
});

/* ── laag 3: de montage ────────────────────────────────────────────────── */

describe("toestemming: de montage", () => {
  /* Een banner die nergens gemonteerd staat is geen banner. app/layout.tsx
     ligt buiten [locale], dus er is geen params.locale -- de taal komt uit
     LocaleProvider, hetzelfde patroon als SkipLink en Preloader. */
  it("de banner hangt in de wortel-layout", () => {
    const l = bron(join(WORTEL, "app", "layout.tsx"));
    expect(l).toContain("@/components/Toestemming");
    expect(l).toContain("<Toestemming />");
  });

  /* Intrekken moet net zo makkelijk zijn als geven (AVG art. 7 lid 3). De
     banner is een klik; zonder deze knop is er geen tweede klik. */
  it("de intrekknop staat op de privacypagina", () => {
    const p = bron(join(WORTEL, "app", "[locale]", "privacy", "page.tsx"));
    expect(p).toContain("@/components/ToestemmingKnop");
    expect(p).toContain("<ToestemmingKnop />");
  });
});

/* ── laag 4: de kopij ──────────────────────────────────────────────────── */

/* De banner is in april 2026 bewust verwijderd op de grond dat Plausible
   cookieloos is, en de privacykopij is toen in vier talen herschreven om dat
   uit te leggen. Die zinnen worden onwaar op het moment dat GA4 erbij komt.
   Deze poort houdt de twee aan elkaar: zolang de tag bedraad is, mag de
   privacypagina niet beweren dat er geen cookies en geen banner zijn. */
const VERVALLEN: Record<string, string[]> = {
  en: ["you do not see a consent banner", "neither one uses cookies", "there is no banner"],
  nl: [
    "zie je geen toestemmingsbanner",
    "geen van beide gebruikt cookies",
    "daarom is er geen banner",
  ],
  de: ["sehen Sie kein Consent-Banner", "keines davon setzt Cookies", "gibt es kein Banner"],
  es: ["no ves un banner de consentimiento", "ninguna usa cookies", "por eso no hay banner"],
};

const CONSENT_SLEUTELS = [
  "consent.aria",
  "consent.title",
  "consent.body",
  "consent.more",
  "consent.yes",
  "consent.no",
  "consent.state.on",
  "consent.state.off",
  "consent.state.body",
  "consent.state.btn.on",
  "consent.state.btn.off",
];

describe("toestemming: de privacykopij", () => {
  it("elke consent-sleutel staat in alle vier de woordenboeken", () => {
    for (const l of LOCALES) {
      for (const k of CONSENT_SLEUTELS) {
        expect(DICT[l][k], `${l} mist ${k}`).toBeTruthy();
      }
    }
  });

  /* translate() valt bij een ontbrekende sleutel terug op Engels, dus een
     bestaande sleutel bewijst nog geen vertaling. Vier gelijke waarden zijn
     het signaal dat er niet vertaald is. */
  it("de banner is werkelijk vertaald, niet teruggevallen op Engels", () => {
    for (const k of ["consent.title", "consent.body", "consent.yes", "consent.no"]) {
      const waarden = LOCALES.map((l) => DICT[l][k]);
      expect(new Set(waarden).size, `${k} is niet vertaald`).toBe(LOCALES.length);
    }
  });

  it("geen enkele taal belooft nog dat er geen cookies en geen banner zijn", () => {
    for (const l of LOCALES) {
      const tekst = `${DICT[l]["priv.p.cookies"]} ${DICT[l]["priv.p.analytics"]}`;
      for (const zin of VERVALLEN[l]) {
        expect(tekst.toLowerCase(), `${l} draagt nog: ${zin}`).not.toContain(zin.toLowerCase());
      }
    }
  });

  it("elke taal noemt de tag die de cookies zet", () => {
    for (const l of LOCALES) {
      expect(DICT[l]["priv.p.analytics"]).toContain("Google Analytics");
      expect(DICT[l]["priv.p.cookies"]).toContain("Google Analytics");
    }
  });

  /* Zonder deze controle is een lege overtreedslijst niet te onderscheiden
     van een detector die niets kan vinden. */
  it("de detector gaat wel af op een zin die er niet meer hoort te staan", () => {
    for (const l of LOCALES) {
      const verzonnen = `Iets onschuldigs. ${VERVALLEN[l][0]}. En nog iets.`;
      expect(verzonnen.toLowerCase()).toContain(VERVALLEN[l][0].toLowerCase());
    }
  });
});
