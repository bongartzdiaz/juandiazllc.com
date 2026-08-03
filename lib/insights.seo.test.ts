import { describe, it, expect } from "vitest";
import { POSTS, getInsight, insightMarkets, type Insight } from "./insights";
import { TITLE_SUFFIX, TITLE_BUDGET } from "./seo/branding";

/* Wat er in de <title> en de <meta name=description> belandt moet passen
 * binnen wat Google toont. De redactionele `title` mag lang zijn — die is de
 * h1 op de pagina en mag een volzin zijn — maar `seo.metaTitle` is wat er in
 * de zoekresultaten komt.
 *
 * De audit meldt dit ook (soort titel-te-lang), maar die draait tegen een
 * draaiende server. Deze gate draait in CI en vangt het vóór de merge. */

const DESC_MAX = 160;

/** Posts zonder i18n: hun tekst staat in de basisvelden, dus één seo-veld
 *  dekt alle markten waarin ze verschijnen. De all-market posts hebben per
 *  taal een eigen titel nodig en komen in een aparte gate. */
const MARKTSPECIFIEK: Insight[] = POSTS.filter((p) => !p.i18n);

describe("elke markt-specifieke insight past in de zoekresultaten", () => {
  it("vindt daadwerkelijk posts om te controleren", () => {
    expect(MARKTSPECIFIEK.length).toBeGreaterThan(10);
  });

  for (const p of MARKTSPECIFIEK) {
    describe(p.slug, () => {
      for (const l of insightMarkets(p)) {
        it(`${l} — titel binnen het budget`, () => {
          const v = getInsight(p.slug, l)!;
          const titel = v.seo?.metaTitle ?? v.title;
          expect(titel.length, `${p.slug}/${l}: ${titel.length} tekens — "${titel}"`).toBeLessThanOrEqual(TITLE_BUDGET);
        });

        it(`${l} — beschrijving binnen ${DESC_MAX} tekens`, () => {
          const v = getInsight(p.slug, l)!;
          const d = v.seo?.metaDescription ?? v.summary;
          expect(d.length, `${p.slug}/${l}: ${d.length} tekens`).toBeLessThanOrEqual(DESC_MAX);
        });
      }

      it("draagt het merk niet zelf al", () => {
        const t = p.seo?.metaTitle ?? "";
        expect(t, p.slug).not.toContain(TITLE_SUFFIX.trim());
        expect(t.toLowerCase(), p.slug).not.toContain("juan diaz");
      });

      it("een seo-veld is gevuld of afwezig, nooit leeg", () => {
        if (!p.seo) return;
        if (p.seo.metaTitle !== undefined) expect(p.seo.metaTitle.trim(), p.slug).not.toBe("");
        if (p.seo.metaDescription !== undefined) expect(p.seo.metaDescription.trim(), p.slug).not.toBe("");
      });
    });
  }
});

describe("de NL-only funnelpost heeft geen Engelse kop meer", () => {
  // Stond als markets:["nl"] met de titel "Why your Dutch lead funnel should
  // start on WhatsApp" boven een Nederlandse samenvatting.
  it("titel en samenvatting zijn allebei Nederlands", () => {
    const p = POSTS.find((x) => x.slug === "whatsapp-first-funnel-nl")!;
    expect(p.markets).toEqual(["nl"]);
    expect(p.title).not.toMatch(/\b(why|your|should|the)\b/i);
    expect(p.title).toContain("leadfunnel");
  });
});
