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

/** Alle posts. Een vertaalde titel heeft een andere lengte dan het origineel,
 *  dus de controle loopt per markt en niet per post. */
const ALLE: Insight[] = POSTS;

describe("elke insight past in de zoekresultaten", () => {
  it("vindt daadwerkelijk posts om te controleren", () => {
    expect(ALLE.length).toBeGreaterThan(15);
  });

  for (const p of ALLE) {
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

      it("geen enkele taal draagt het merk zelf al", () => {
        for (const l of insightMarkets(p)) {
          const t = getInsight(p.slug, l)!.seo?.metaTitle ?? "";
          expect(t, `${p.slug}/${l}`).not.toContain(TITLE_SUFFIX.trim());
          expect(t.toLowerCase(), `${p.slug}/${l}`).not.toContain("juan diaz");
        }
      });

      it("een seo-veld is gevuld of afwezig, nooit leeg", () => {
        for (const seo of [p.seo, ...Object.values(p.i18n ?? {}).map((v) => v?.seo)]) {
          if (!seo) continue;
          if (seo.metaTitle !== undefined) expect(seo.metaTitle.trim(), p.slug).not.toBe("");
          if (seo.metaDescription !== undefined) expect(seo.metaDescription.trim(), p.slug).not.toBe("");
        }
      });

      // Vier identieke zoektitels zouden de vier markten weer op één
      // zoekresultaat laten concurreren.
      it("de zoektitels verschillen per markt", () => {
        const markten = insightMarkets(p);
        if (markten.length < 2) return;
        const titels = markten.map((l) => {
          const v = getInsight(p.slug, l)!;
          return v.seo?.metaTitle ?? v.title;
        });
        expect(new Set(titels).size, `dubbel: ${JSON.stringify(titels)}`).toBe(markten.length);
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
