import { translate, type Locale } from "@/lib/i18n/dict";

/** Tagnaam naar URL-segment: "Real estate" wordt "real-estate".
 *
 *  Stond identiek in de insights- en de signals-tagpagina. Beide routes lezen
 *  hem nu hier, want twee kopieën van een slug-functie die URL's bepaalt is
 *  precies waar drift een 404 oplevert. */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Vertaald label voor een tag-slug.
 *
 *  De slug zelf is de routeersleutel — /insights/tag/real-estate is in elke
 *  taal dezelfde URL — dus alleen wat de lezer ziet vertaalt.
 *
 *  `translate()` valt terug op het Engels wanneer een sleutel ontbreekt, en
 *  geeft de sleutelnaam terug wanneer hij in geen enkele taal bestaat. Dat
 *  laatste zou "tag.label.energy" op de pagina zetten. Vandaar de expliciete
 *  controle: bij een ontbrekende sleutel wint de canonieke Engelse tagnaam,
 *  wat lelijk is maar leesbaar, in plaats van een sleutelnaam die er als een
 *  defect uitziet.
 *
 *  Nieuwe tags horen dus een `tag.label.<slug>` te krijgen in alle vier de
 *  woordenboeken; tags.test.ts controleert dat voor elke tag die in gebruik is. */
export function tagLabel(locale: Locale, slug: string, fallback: string): string {
  const sleutel = `tag.label.${slug}`;
  const waarde = translate(locale, sleutel);
  return waarde === sleutel ? fallback : waarde;
}
