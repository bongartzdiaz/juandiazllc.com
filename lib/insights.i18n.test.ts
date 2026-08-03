import { describe, it, expect } from "vitest";
import { POSTS, getInsight, insightMarkets, type Insight, type InsightBlock } from "./insights";
import { LOCALES, type Locale } from "./i18n/dict";

/* Structurele gate over de vertalingen van insights.
 *
 * insights.ts gebruikt een ander i18n-patroon dan sectors/ventures/signals:
 * InsightL10n vervangt de body in zijn geheel in plaats van per index samen te
 * voegen. Er is dus geen merge-functie die de structuur bewaakt — een
 * vertaling met te weinig blokken, of met een kop waar een citaat hoorde,
 * rendert gewoon anders dan het origineel zonder dat iets klaagt.
 *
 * Deze suite is die bewaking. */

const vorm = (b: InsightBlock[]) => b.map((x) => x.type).join(",");

const tekstOf = (b: InsightBlock): string =>
  b.type === "ul" ? b.items.join(" | ") : b.text;

const vertaald = (p: Insight): Locale[] =>
  (Object.keys(p.i18n ?? {}) as Locale[]).filter((l) => p.i18n?.[l]);

describe("elke insight-vertaling volgt de structuur van de basis", () => {
  for (const p of POSTS.filter((x) => vertaald(x).length > 0)) {
    describe(p.slug, () => {
      for (const l of vertaald(p)) {
        it(`${l} — evenveel blokken, in dezelfde volgorde en van hetzelfde type`, () => {
          const v = p.i18n![l]!;
          expect(v.body, `${p.slug}/${l} aantal blokken`).toHaveLength(p.body.length);
          expect(vorm(v.body), `${p.slug}/${l} blokvolgorde`).toBe(vorm(p.body));
        });

        it(`${l} — lijsten hebben evenveel punten als de basis`, () => {
          const v = p.i18n![l]!;
          for (const [i, b] of v.body.entries()) {
            const basis = p.body[i];
            if (b.type === "ul" && basis.type === "ul") {
              expect(b.items, `${p.slug}/${l} lijst op positie ${i}`).toHaveLength(basis.items.length);
            }
          }
        });

        it(`${l} — geen enkel blok is nog letterlijk het Engels`, () => {
          const v = p.i18n![l]!;
          expect(v.title, `${p.slug}/${l} titel`).not.toBe(p.title);
          expect(v.summary, `${p.slug}/${l} samenvatting`).not.toBe(p.summary);
          for (const [i, b] of v.body.entries()) {
            expect(tekstOf(b), `${p.slug}/${l} blok ${i + 1}`).not.toBe(tekstOf(p.body[i]));
          }
        });

        // Een cta draagt een route. Die hoort in elke taal naar dezelfde
        // pagina te wijzen; alleen het label vertaalt.
        it(`${l} — cta-blokken houden hun href`, () => {
          const v = p.i18n![l]!;
          for (const [i, b] of v.body.entries()) {
            const basis = p.body[i];
            if (b.type === "cta" && basis.type === "cta") {
              expect(b.href, `${p.slug}/${l} cta op positie ${i}`).toBe(basis.href);
            }
          }
        });
      }

      it("levert per markt een eigen titel op", () => {
        const markten = insightMarkets(p);
        const titels = markten.map((l) => getInsight(p.slug, l)!.title);
        expect(new Set(titels).size, `dubbele titel over ${markten.join(",")}: ${JSON.stringify(titels)}`)
          .toBe(markten.length);
      });
    });
  }
});

describe("de negen all-market artikelen hebben Nederlands", () => {
  const FASE_D = [
    "the-automation-roi-myth",
    "why-operator-crms-fail",
    "the-build-vs-buy-trap",
    "the-field-team-is-the-product",
    "why-most-operator-dashboards-lie",
    "the-esg-number-your-asset-manager-cant-defend",
    "the-ten-minutes-before-check-in",
    "the-retrofit-roi-model-that-doesnt-survive-the-building",
    "what-your-channel-mix-hides-about-your-best-guests",
  ];

  for (const slug of FASE_D) {
    it(`${slug} — nl aanwezig en rendert op /nl`, () => {
      const p = POSTS.find((x) => x.slug === slug);
      expect(p, `${slug} bestaat niet meer`).toBeDefined();
      expect(p!.i18n?.nl, `${slug} mist nl`).toBeDefined();
      expect(getInsight(slug, "nl")!.title).toBe(p!.i18n!.nl!.title);
      expect(getInsight(slug, "nl")!.title).not.toBe(p!.title);
    });
  }

  // Deze artikelen hebben geen markets-veld, dus ze horen in alle vier de
  // talen te bestaan. LOCALES wordt hier expliciet doorlopen zodat een
  // toekomstige vijfde taal deze test laat vallen in plaats van stilzwijgend
  // Engels te serveren.
  it("elk van de negen dekt alle locales die de site kent", () => {
    for (const slug of FASE_D) {
      const p = POSTS.find((x) => x.slug === slug)!;
      expect(insightMarkets(p), `${slug}`).toEqual([...LOCALES]);
      for (const l of LOCALES) {
        expect(getInsight(slug, l), `${slug}/${l}`).toBeDefined();
      }
    }
  });
});
