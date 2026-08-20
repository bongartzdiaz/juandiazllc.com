import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { bouwLlmsTxt, bouwLlmsFullTxt, laatsteInhoudsdatum } from "./llms";
import { insightNaarTekst } from "./plattetekst";
import { getAllInsights } from "@/lib/insights";
import { SIGNALS } from "@/lib/signals";
import { VENTURES } from "@/lib/ventures";

/* Poort: /llms.txt spreekt de site niet tegen.
 *
 * Dit bestand bestaat omdat de handgeschreven voorganger een claim droeg die
 * elders al gerepareerd wás. Gemeten op 2026-08-20 stond er in
 * `public/llms.txt`:
 *
 *     "Five active ventures — Voltafy, Performance Tracker, Help Mij Besparen,
 *      Salderingsregeling 2027, Philly/DEUS CRM."
 *
 * terwijl `work.page.lede` sinds PR #188 in alle vier de talen "four live
 * products … Philly is still in build" zegt, met een poort eromheen. Die poort
 * leest `dict.ts`. Dit bestand stond in `public/` en werd door niets gelezen —
 * en het is uitgerekend het bestand dat wij AI-assistenten vragen te citeren.
 *
 * DE VIERDE TEST IS DE ONVERWACHTE. `public/llms.txt` mag niet terugkomen:
 * Next serveert statische bestanden vóór routes met dezelfde naam, dus een
 * teruggezet bestand zet de generator uit zonder één foutmelding. De route
 * blijft in de build staan, hij wordt alleen nooit meer geraakt. */

const WORTEL = join(__dirname, "..", "..");

/** Telwoorden die in de venture-regel juist NIET horen te staan. Een lijst
 *  draagt zijn eigen aantal; een woord ernaast is een tweede bron die kan
 *  verlopen, en dat is precies wat er gebeurd is. */
const TELWOORDEN = ["one", "two", "three", "four", "five", "six", "seven"];

describe("/llms.txt", () => {
  const txt = bouwLlmsTxt();

  it("de meetlat werkt — het bestand is gevuld en draagt de kopregels", () => {
    // Zonder deze controle zou een generator die "" teruggeeft alles groen maken.
    expect(txt.length).toBeGreaterThan(1500);
    for (const kop of ["## Site map", "## Locales", "## Contact", "## Last updated"]) {
      expect(txt, `kop ontbreekt: ${kop}`).toContain(kop);
    }
  });

  it("de Work-regel noemt de live producten en geen ander", () => {
    const regel = txt.split("\n").find((r) => r.startsWith("- [Work]"));
    expect(regel, "geen Work-regel in de site map").toBeTruthy();

    for (const v of VENTURES) {
      if (v.status === "live") {
        expect(regel, `live product ontbreekt: ${v.name}`).toContain(v.name);
      }
    }

    // Een niet-live product mag genoemd worden, maar nooit als live. Philly
    // stond hier als vijfde live venture; nu hoort er "is still in build"
    // achter, of hij hoort er niet te staan.
    for (const v of VENTURES.filter((x) => x.status !== "live")) {
      if (regel!.includes(v.name)) {
        expect(regel, `${v.name} is ${v.status}, maar staat zonder voorbehoud`).toMatch(
          /still in build/,
        );
      }
    }
  });

  it("de Work-regel telt niet in woorden", () => {
    const regel = txt.split("\n").find((r) => r.startsWith("- [Work]"))!.toLowerCase();
    // Op woordgrens, en bewust zonder een regex uit een template literal te
    // bouwen: `\b` is daarin het backspace-teken, geen woordgrens. Die versie
    // stond hier eerst en kon per definitie niets vinden — de mutatietest liep
    // er groen doorheen met de onwaarheid er letterlijk in.
    const woorden = new Set(regel.split(/[^a-z]+/));
    const gevonden = TELWOORDEN.filter((w) => woorden.has(w));
    expect(
      gevonden,
      "Een telwoord naast de lijst is een tweede bron voor hetzelfde feit. " +
        "Precies zo raakte 'Five active ventures' uit de pas met vier live producten.",
    ).toEqual([]);
  });

  it("public/llms.txt is er niet — anders staat de generator uit", () => {
    expect(
      existsSync(join(WORTEL, "public", "llms.txt")),
      "Next serveert public/ vóór app-routes met dezelfde naam. Een teruggezet " +
        "statisch bestand schakelt app/llms.txt/route.ts uit zonder foutmelding.",
    ).toBe(false);
  });

  it("elke link in de site map wijst naar een pagina die bestaat", () => {
    const paden = [...txt.matchAll(/^- \[[^\]]+\]\(https?:\/\/[^/]+\/en(\/[^)]*)\)/gm)].map(
      (m) => m[1],
    );
    expect(paden.length).toBeGreaterThan(8);

    const dood = paden.filter(
      (pad) => !existsSync(join(WORTEL, "app", "[locale]", ...pad.slice(1).split("/"), "page.tsx")),
    );
    expect(dood, "site-map-link zonder pagina").toEqual([]);
  });

  it("Last updated is de nieuwste inhoud, niet een ingetypte datum", () => {
    const nieuwste = [
      ...getAllInsights().map((p) => p.updatedAt ?? p.publishedAt),
      ...SIGNALS.map((s) => s.date),
    ]
      .map((d) => d.slice(0, 10))
      .sort()
      .at(-1);

    expect(laatsteInhoudsdatum()).toBe(nieuwste);
    expect(txt).toContain(`## Last updated\n\nNewest article: ${nieuwste}.`);
  });
});

describe("/llms-full.txt", () => {
  const vol = bouwLlmsFullTxt();

  it("draagt elk artikel dat onder /en staat, en geen URL uit een andere markt", () => {
    const posts = getAllInsights("en");
    expect(posts.length).toBeGreaterThan(5);
    for (const p of posts) {
      expect(vol, `artikel ontbreekt: ${p.slug}`).toContain(`/en/insights/${p.slug}`);
    }

    // Markt-specifieke stukken (NL saldering, DE Heimspeicher, ES autoconsumo)
    // bestaan niet onder /en. Ze hier opnemen zou een assistent URL's geven
    // die 404 geven.
    const buiten = getAllInsights().filter((p) => !posts.some((q) => q.slug === p.slug));
    for (const p of buiten) {
      expect(vol, `${p.slug} staat niet onder /en maar wordt wel gelinkt`).not.toContain(
        `/en/insights/${p.slug}`,
      );
    }
  });

  it("het corpus draagt elk bloktype — anders bewijzen de twee tests hieronder niets", () => {
    // Zonder deze controle zou "geen cta verdween" waar zijn omdat er geen
    // enkele cta is. Een assertie over een lege verzameling slaagt altijd.
    const types = new Set(getAllInsights().flatMap((p) => p.body.map((b) => b.type)));
    for (const t of ["h2", "p", "ul", "quote", "cta"]) {
      expect(types.has(t as never), `geen enkel "${t}"-blok in de content`).toBe(true);
    }
  });

  it("de afvlakker laat geen blok vallen", () => {
    // Dit is de test die een zesde bloktype vangt als de `never`-tak ooit
    // wordt weggehaald: elk stukje tekst uit de body moet terugkomen. Over
    // álle markten, want de afvlakker kent geen markt.
    for (const p of getAllInsights()) {
      const plat = insightNaarTekst(p.body);
      for (const blok of p.body) {
        const stukken = blok.type === "ul" ? blok.items : [blok.text];
        for (const s of stukken) {
          expect(plat, `${p.slug}: blok "${blok.type}" verdween uit de platte tekst`).toContain(s);
        }
      }
    }
  });

  it("de markdown-vorm behoudt structuur en de href van een cta", () => {
    // De platte vorm gooit de href van een cta weg — voor JSON Feed's
    // content_text is dat per specificatie juist, voor een bestand dat
    // gelezen wordt om geparseerd te worden is het verlies.
    for (const p of getAllInsights()) {
      const md = insightNaarTekst(p.body, "markdown");
      for (const blok of p.body) {
        const stukken = blok.type === "ul" ? blok.items : [blok.text];
        for (const s of stukken) {
          expect(md, `${p.slug}: "${blok.type}" verdween uit de markdown-vorm`).toContain(s);
        }
        if (blok.type === "cta") expect(md, `${p.slug}: href van de cta weg`).toContain(blok.href);
        if (blok.type === "h2") expect(md).toContain(`#### ${blok.text}`);
      }
    }
  });

  it("wijst terug naar de index, zodat de twee niet los van elkaar leven", () => {
    expect(vol).toContain("/llms.txt");
    expect(bouwLlmsTxt()).toContain("/llms-full.txt");
  });
});
