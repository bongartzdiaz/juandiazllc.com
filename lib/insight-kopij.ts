import type { Insight, InsightBlock } from "./insights";

/* Eén platslager voor de kopij van een artikel.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. `lib/saldering.test.ts` en `lib/i18n/nederlands.test.ts` droegen
 * elk hun eigen kopie van deze functie, regel voor regel gelijk. Bij het
 * schrijven van `lib/wpm.test.ts` zou er een derde bijkomen, en dat is de
 * bugklasse waar dit logboek het vaakst op terugkomt: twee lijsten die één
 * feit dragen lopen uit elkaar, en dan bewaakt de zwakste.
 *
 * Zelfde reden waarom `metricsUitClaims` in #288 naar een eigen module ging
 * vóórdat er een tweede kopie kon ontstaan.
 *
 * Deze module wordt door poorten gelezen, dus een fout hierin verzwakt drie
 * poorten tegelijk. Vandaar de zelftests in `lib/wpm.test.ts` onder "de
 * platslager zelf". */

/** Alle zichtbare kopij van één artikel, inclusief de zoekvelden.
 *
 *  BEWUST ZONDER DE SLUG: die is een URL en geen proza. Twee gepubliceerde
 *  slugs dragen "uw" ("…-die-u-niet-ziet", "…-controleert-uw-cijfers-…") omdat
 *  ze al live waren toen de aanspreekvorm werd rechtgezet; een URL hernoemen
 *  kost een 404 en er is in deze repo geen redirect-laag om die op te vangen.
 *
 *  BEWUST ZONDER DE HREF van een `cta`: ook een URL. De zichtbare kant van een
 *  cta is zijn label, en dat zit er wél in. Wie de doelen nodig heeft, gebruikt
 *  `ctaHrefs()` hieronder. */
export function kopij(p: Insight): string {
  const uitBlok = (b: InsightBlock): string[] => {
    switch (b.type) {
      case "ul":
        return b.items;
      case "quote":
        return [b.text, b.cite ?? ""];
      default:
        return [b.text];
    }
  };
  return [
    p.title,
    p.summary,
    p.seo?.metaTitle ?? "",
    p.seo?.metaDescription ?? "",
    ...p.body.flatMap(uitBlok),
  ].join(" \n ");
}

/** De doelen van de `cta`-blokken van één artikel. Nodig om te bewijzen dat een
 *  cluster onderling gelinkt is; `kopij()` laat ze er juist uit. */
export function ctaHrefs(p: Insight): string[] {
  return p.body.filter((b) => b.type === "cta").map((b) => b.href);
}
