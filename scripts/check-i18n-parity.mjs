// Controleert of alle vier de woordenboeken in lib/i18n/dict.ts exact dezelfde
// sleutels hebben.
//
// WAAROM DIT BESTAAT
//
// translate() valt stil terug op Engels wanneer een sleutel ontbreekt. Een
// vergeten NL-vertaling levert dus geen foutmelding en geen lege plek op, maar
// keurige Engelse tekst op een Nederlandse pagina. Dat ziet er werkend uit en
// haalt daarom elke handmatige controle.
//
// CLAUDE.md noemt dit al: "Keep the key sets identical across all four
// dictionaries" en "treat that as a translation bug, not a feature". Dit script
// maakt die regel afdwingbaar in plaats van goedbedoeld.
//
// Run:  node scripts/check-i18n-parity.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DICT = join(ROOT, 'lib', 'i18n', 'dict.ts');

const LOCALES = ['en', 'nl', 'de', 'es'];

const src = readFileSync(DICT, 'utf8');

// De woordenboeken staan als `const en: Dict = {` ... `const nl: Dict = {`
// achter elkaar in één bestand. We knippen op die declaraties en lezen per blok
// de sleutels. Let op: verderop in het bestand staan ook objecten met en/nl/de/
// es-velden (taallabels); die matchen hier niet, want die zijn ingesprongen.
function sleutelsPerLocale() {
  const posities = LOCALES.map((l) => {
    const m = new RegExp(`^const ${l}\\s*:\\s*Dict\\s*=\\s*\\{`, 'm').exec(src);
    if (!m) throw new Error(`geen woordenboek gevonden voor "${l}" in ${DICT}`);
    return { locale: l, start: m.index };
  }).sort((a, b) => a.start - b.start);

  const uit = new Map();
  for (let i = 0; i < posities.length; i++) {
    const { locale, start } = posities[i];
    const einde = i + 1 < posities.length ? posities[i + 1].start : src.length;
    const blok = src.slice(start, einde);
    const sleutels = new Set();
    for (const m of blok.matchAll(/^\s{2,}"([^"]+)":/gm)) sleutels.add(m[1]);
    uit.set(locale, sleutels);
  }
  return uit;
}

const perLocale = sleutelsPerLocale();
const alle = new Set([...perLocale.values()].flatMap((s) => [...s]));

let problemen = 0;
for (const locale of LOCALES) {
  const heeft = perLocale.get(locale);
  const mist = [...alle].filter((k) => !heeft.has(k)).sort();
  console.log(`  ${locale}: ${heeft.size} sleutels${mist.length ? ` — ${mist.length} ONTBREKEN` : ''}`);
  for (const k of mist.slice(0, 25)) console.log(`      ontbreekt: ${k}`);
  if (mist.length > 25) console.log(`      … en nog ${mist.length - 25}`);
  problemen += mist.length;
}

if (problemen > 0) {
  console.error(
    `\n${problemen} ontbrekende sleutel(s). Die verschijnen op de site als ` +
      `Engelse tekst, niet als fout — daarom faalt dit script erop.\n`,
  );
  process.exit(1);
}

console.log(`\n  ✅ alle vier de woordenboeken hebben dezelfde ${alle.size} sleutels\n`);
