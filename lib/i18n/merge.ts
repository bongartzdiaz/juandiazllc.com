/** Gedeelde bouwsteen voor de i18n-overlays op de contentlagen
 *  (lib/sectors.ts, lib/ventures.ts, lib/signals.ts).
 *
 *  Elk van die bestanden legt een `Partial<...>` per taal over een Engelse
 *  basis heen. Een gewone spread is daarvoor net niet goed genoeg: een sleutel
 *  die expliciet op `undefined` staat overschrijft de basiswaarde met
 *  `undefined` in plaats van hem te laten staan.
 *
 *      { ...basis, ...{ tagline: undefined } }   // tagline is nu weg
 *
 *  In de praktijk gebeurt dat zodra iemand een veld tijdelijk uitcommentarieert
 *  of een vertaalobject programmatisch opbouwt. De pagina rendert dan leeg in
 *  plaats van Engels, wat een subtielere fout is dan het probleem dat de
 *  overlay moest oplossen. */
export function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Voegt een vertaalde lijst per index samen met de basislijst.
 *
 *  Gebruikt waar een lijstitem zowel kopij als structuur bevat en die twee niet
 *  in het type te scheiden zijn: `proof[].href` is een route, `phases[].title`
 *  is de naam van een methodefase. De basis levert die velden, de vertaling
 *  alleen de tekst.
 *
 *  De lengte van de basis is leidend. Een kortere vertaling laat de resterende
 *  items op het Engels staan in plaats van ze te laten verdwijnen; de
 *  bijbehorende testsuite eist gelijke lengtes, zodat dat gat zichtbaar wordt
 *  in plaats van stil te blijven. */
export function mergeByIndex<T extends object>(basis: T[], vertaling: Partial<T>[] | undefined): T[] {
  if (!vertaling) return basis;
  return basis.map((item, i) => ({ ...item, ...defined(vertaling[i] ?? {}) }));
}
