import { describe, it, expect } from "vitest";
import { SIGNALS, getSignal, getSignals, localizeSignal, type Signal } from "./signals";
import { TITLE_SUFFIX, TITLE_BUDGET } from "./seo/branding";
import { LOCALES, type Locale } from "./i18n/dict";

const VERTAALD: Locale[] = ["nl", "de", "es"];

const basis: Signal = {
  slug: "test",
  date: "2026-01-01",
  dateLabel: "2026.01 · Essay",
  tag: "Design",
  readTime: "5 min read",
  title: "Basis-titel.",
  seoTitle: "Basis SEO-titel",
  excerpt: "Basis-samenvatting.",
  body: [
    { type: "p", text: "EN alinea." },
    { type: "h2", text: "EN kop." },
    { type: "quote", text: "EN citaat." },
  ],
};

describe("localizeSignal", () => {
  it("geeft de basis terug als de taal geen vertaling heeft", () => {
    expect(localizeSignal(basis, "de")).toBe(basis);
  });

  it("vervangt kopij en laat de rest staan", () => {
    const s = localizeSignal({ ...basis, i18n: { nl: { title: "NL-titel." } } }, "nl");
    expect(s.title).toBe("NL-titel.");
    expect(s.excerpt).toBe("Basis-samenvatting.");
  });

  // Het bloktype bepaalt of iets als alinea, kop of citaat rendert. Dat is
  // structuur: een vertaling mag een citaat niet in een kop veranderen.
  it("houdt het bloktype bij de basis en vertaalt alleen de tekst", () => {
    const s = localizeSignal(
      { ...basis, i18n: { nl: { body: [{ text: "NL alinea." }, { text: "NL kop." }, { text: "NL citaat." }] } } },
      "nl",
    );
    expect(s.body.map((b) => b.type)).toEqual(["p", "h2", "quote"]);
    expect(s.body[2].text).toBe("NL citaat.");
  });

  it("raakt slug, datum en tag nooit aan", () => {
    const s = localizeSignal({ ...basis, i18n: { nl: { title: "NL." } } }, "nl");
    expect(s.slug).toBe("test");
    expect(s.date).toBe("2026-01-01");
    expect(s.tag).toBe("Design");
  });

  it("muteert de basis niet", () => {
    const bron = { ...basis, i18n: { nl: { body: [{ text: "NL." }] } } };
    localizeSignal(bron, "nl");
    expect(bron.body[0].text).toBe("EN alinea.");
  });
});

describe("getSignal / getSignals", () => {
  it("zonder taal komt de basis terug", () => {
    expect(getSignal("five-phases")?.title).toContain("construction project");
    expect(getSignals()).toHaveLength(SIGNALS.length);
  });

  it("met taal komt de vertaling terug", () => {
    expect(getSignal("five-phases", "nl")?.title).toBe("Elk bedrijf is een bouwproject. Dit is het vijffasenplan.");
  });

  it("een onbekende slug geeft undefined", () => {
    expect(getSignal("bestaat-niet", "nl")).toBeUndefined();
  });
});

describe("elk signal is in alle vier de talen af", () => {
  for (const s of SIGNALS) {
    describe(s.slug, () => {
      it("heeft een vertaling voor nl, de en es", () => {
        for (const l of VERTAALD) {
          expect(s.i18n?.[l], `${s.slug} mist ${l}`).toBeDefined();
        }
      });

      it("levert vier verschillende titels op", () => {
        const t = LOCALES.map((l) => getSignal(s.slug, l)!.seoTitle ?? getSignal(s.slug, l)!.title);
        expect(new Set(t).size, `dubbele titel: ${JSON.stringify(t)}`).toBe(LOCALES.length);
      });

      it("levert vier verschillende samenvattingen op", () => {
        const e = LOCALES.map((l) => getSignal(s.slug, l)!.excerpt);
        expect(new Set(e).size, `dubbele samenvatting: ${JSON.stringify(e)}`).toBe(LOCALES.length);
      });

      // De redactionele titel mag lang zijn; wat in de <title> belandt niet.
      it("elke titel past binnen het budget dat Google toont", () => {
        for (const l of LOCALES) {
          const x = getSignal(s.slug, l)!;
          const titel = x.seoTitle ?? x.title;
          expect(titel.length, `${s.slug}/${l} is ${titel.length} tekens: "${titel}"`).toBeLessThanOrEqual(TITLE_BUDGET);
        }
      });

      it("geen enkele titel draagt het merk zelf al", () => {
        for (const l of LOCALES) {
          const titel = getSignal(s.slug, l)!.seoTitle ?? "";
          expect(titel, `${s.slug}/${l}`).not.toContain(TITLE_SUFFIX.trim());
          expect(titel.toLowerCase(), `${s.slug}/${l}`).not.toContain("juan diaz");
        }
      });

      // Bewust op s.i18n en niet op het resultaat van getSignal: mergeByIndex
      // vult korte vertalingen aan vanuit de basis, dus een assertie op het
      // samengevoegde resultaat zou per definitie slagen en niets bewaken.
      it("de vertaalde body heeft evenveel blokken als de basis", () => {
        for (const l of VERTAALD) {
          expect(s.i18n?.[l]?.body, `${s.slug}/${l} body ontbreekt`).toBeDefined();
          expect(s.i18n![l]!.body, `${s.slug}/${l}`).toHaveLength(s.body.length);
        }
      });

      // De tag stuurt /signals/tag/[tag] aan; vertalen zou per taal een andere
      // URL opleveren.
      it("de tag blijft in elke taal gelijk", () => {
        for (const l of VERTAALD) {
          expect(getSignal(s.slug, l)!.tag).toBe(s.tag);
        }
      });

      it("geen enkel tekstblok is nog identiek aan het Engels", () => {
        for (const l of VERTAALD) {
          const x = getSignal(s.slug, l)!;
          expect(x.title, `${s.slug}/${l} titel`).not.toBe(s.title);
          expect(x.excerpt, `${s.slug}/${l} samenvatting`).not.toBe(s.excerpt);
          expect(x.readTime, `${s.slug}/${l} leestijd`).not.toBe(s.readTime);
          for (const [i, b] of x.body.entries()) {
            // De fasekoppen "01 — Survey" zijn eigennamen van de methode en
            // zijn in elke taal identiek; die uitzondering is bedoeld.
            const eigennaam = /^\d\d — (Survey|Blueprint|Build|Commission|Operate)$/.test(String(s.body[i].text));
            if (eigennaam) continue;
            expect(b.text, `${s.slug}/${l} blok ${i + 1}`).not.toBe(s.body[i].text);
          }
        }
      });
    });
  }
});
