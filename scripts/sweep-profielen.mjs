/**
 * Welke tijdelijke Chrome-profielen van `responsive-sweep.mjs` mogen weg.
 *
 * Staat apart en zonder neveneffecten zodat `lib/sweep-profielen.test.ts` hem
 * kan toetsen; `responsive-sweep.mjs` zelf start bij import meteen Chrome en is
 * daarom niet importeerbaar in een test.
 *
 * WAAROM ER IETS OP TE RUIMEN VALT. De sweep maakte per run een profiel en
 * wiste het na afloop -- maar `chrome.kill()` stuurt alleen een signaal en komt
 * meteen terug, dus de `rmSync` erna liep terwijl Windows de bestanden nog
 * vasthield. Die fout werd door een lege `catch {}` opgeslikt. Gemeten op
 * 2026-09-23: 18 profielen, samen 1,3 GB.
 */

/** Naam die deze sweep uitdeelt: `sweep-profiel-<13 cijfers>` (Date.now()). */
export const PROFIEL_PATROON = /^sweep-profiel-(\d{13})$/;

/**
 * Twee uur. Een sweep duurt 12 tot 18 minuten (gemeten: 695s over 196 URL's,
 * 1063s over 323), dus deze marge raakt nooit een run die nog bezig is.
 * Dat is de hele reden dat er een leeftijdsgrens staat en niet "alles weg":
 * twee sweeps naast elkaar mogen elkaars profiel niet onder de voeten weghalen.
 */
export const MAX_LEEFTIJD_MS = 2 * 60 * 60 * 1000;

/**
 * @param {string[]} namen    bestandsnamen uit de temp-map
 * @param {number}   nu       Date.now()
 * @param {string}   eigen    profielnaam van de lopende run; blijft altijd staan
 * @param {number}   maxLeeftijdMs
 * @returns {string[]} namen die weg mogen
 */
export function verouderdeProfielen(namen, nu, eigen, maxLeeftijdMs = MAX_LEEFTIJD_MS) {
  return namen.filter((naam) => {
    if (naam === eigen) return false;
    const m = PROFIEL_PATROON.exec(naam);
    if (!m) return false;
    const gemaakt = Number(m[1]);
    // Een stempel uit de toekomst geeft een negatief verschil en valt hier
    // vanzelf af -- een verzette klok maakt van `onbekend` geen `oud`.
    // Een expliciete controle daarop stond hier eerst, maar die kon niet
    // falen en dekte dus niets af. Zie feedback_assert_niet_door_het_vangnet.
    return nu - gemaakt > maxLeeftijdMs;
  });
}
