/* Haalt zoekdata op bij DataForSEO en zet er een leesbaar rapport van neer.
   ───────────────────────────────────────────────────────────────────────────
   Draaien:
     npx tsx scripts/seo-report.ts --dry     toont wat het zou opvragen, gratis
     npx tsx scripts/seo-report.ts           doet de echte verzoeken
     npx tsx scripts/seo-report.ts --markt=de

   Dit KOST GELD per verzoek. Daarom drukt het script de kosten per onderdeel
   én het totaal af, en is --dry de manier om eerst te kijken wat er gebeurt.

   Wat het beantwoordt, in deze volgorde:
     1. Waar rankt de site al op?   — dat is vandaag volledig onbekend
     2. Is er publiek voor de energie-cluster? — 15 artikelen op aanname geschreven
     3. Wie staat erboven, en met welke backlinks? — DR is 0.0

   Niet in scope: clicks en vertoningen. Die staan alleen in Search Console en
   zijn privé voor de eigenaar van de property — geen enkele derde partij komt
   erbij. Zie MANUAL_TASKS.md voor het koppelen daarvan.
   ─────────────────────────────────────────────────────────────────────────── */

import {
  roep,
  credentialsUitEnv,
  bouwUrl,
  bouwBody,
  DFS_MIN_INTERVAL_MS,
  type DfsEndpoint,
  type DfsTaak,
} from "../lib/seo/dataforseo";

const DOMEIN = "juandiazllc.com";

/* Bewust location_name en niet location_code.
   DataForSEO accepteert allebei, maar ze falen verschillend: een onbekende
   NAAM geeft een fout, een verkeerde CODE geeft gewoon data over een ander
   land terug. Ik kon de codes (2528/2276/2724/2840) op 2026-08-03 niet tegen
   een bron verifiëren, dus dan liever de variant die hard stukgaat. */
const MARKTEN = {
  nl: { locatie: "Netherlands", taal: "nl", naam: "Nederland" },
  de: { locatie: "Germany", taal: "de", naam: "Duitsland" },
  es: { locatie: "Spain", taal: "es", naam: "Spanje" },
  us: { locatie: "United States", taal: "en", naam: "Verenigde Staten" },
} as const;

type MarktSleutel = keyof typeof MARKTEN;

/** Zoekwoorden van de energie-cluster, per markt. Handmatig, omdat de slugs
 *  Nederlands/Duits/Spaans zijn en de zoekterm niet altijd de slug is. */
const CLUSTER: Record<MarktSleutel, string[]> = {
  nl: [
    "salderingsregeling 2027",
    "thuisbatterij terugverdientijd",
    "dynamisch energiecontract",
    "saldering stopt",
    "thuisbatterij kopen",
  ],
  de: [
    "heimspeicher wirtschaftlichkeit",
    "dynamische stromtarife",
    "einspeiseverguetung 2026",
    "photovoltaik speicher amortisation",
  ],
  es: [
    "autoconsumo con bateria rentabilidad",
    "compensacion de excedentes",
    "bateria virtual",
    "placas solares amortizacion",
  ],
  us: ["fractional revenue operations", "revenue operations consultant"],
};

const args = process.argv.slice(2);
const droog = args.includes("--dry");
const marktArg = (args.find((a) => a.startsWith("--markt="))?.split("=")[1] ?? "nl") as MarktSleutel;

if (!MARKTEN[marktArg]) {
  console.error(`Onbekende markt "${marktArg}". Kies uit: ${Object.keys(MARKTEN).join(", ")}`);
  process.exit(1);
}
const markt = MARKTEN[marktArg];

type Onderdeel = { titel: string; endpoint: DfsEndpoint; taken: DfsTaak[] };

const onderdelen: Onderdeel[] = [
  {
    titel: `1. Waar rankt ${DOMEIN} al op? (${markt.naam})`,
    endpoint: "rankedKeywords",
    taken: [{ target: DOMEIN, location_name: markt.locatie, language_code: markt.taal, limit: 100 }],
  },
  {
    titel: `2. Zoekvolume energie-cluster (${markt.naam})`,
    endpoint: "searchVolume",
    taken: [{ keywords: CLUSTER[marktArg], location_name: markt.locatie, language_code: markt.taal }],
  },
  {
    titel: `3. Concurrenten op dezelfde termen (${markt.naam})`,
    endpoint: "competitors",
    taken: [{ target: DOMEIN, location_name: markt.locatie, language_code: markt.taal, limit: 20 }],
  },
  {
    titel: "4. Backlink-samenvatting",
    endpoint: "backlinksSummary",
    taken: [{ target: DOMEIN }],
  },
];

function toonDroog(): void {
  console.log(`DROOG DRAAIEN — geen verzoeken, geen kosten.\n`);
  console.log(`domein:  ${DOMEIN}`);
  console.log(`markt:   ${markt.naam} (location_name "${markt.locatie}", language_code ${markt.taal})`);
  console.log(`tempo:   ${DFS_MIN_INTERVAL_MS / 1000}s tussen verzoeken (12/min-grens)`);
  console.log(`totaal:  ${onderdelen.length} verzoeken, dus ~${((onderdelen.length - 1) * DFS_MIN_INTERVAL_MS) / 1000}s wachttijd\n`);
  for (const o of onderdelen) {
    console.log(`${o.titel}`);
    console.log(`  POST ${bouwUrl(o.endpoint)}`);
    console.log(`  body ${JSON.stringify(bouwBody(o.taken))}`);
    console.log("");
  }
  const cred = credentialsUitEnv();
  console.log(cred ? "Inloggegevens gevonden — zonder --dry draait dit echt." : "LET OP: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD zijn niet gezet.");
}

async function draai(): Promise<void> {
  if (!credentialsUitEnv()) {
    console.error("DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD zijn niet gezet.");
    console.error("Haal ze op bij app.dataforseo.com/api-access (dat is NIET je accountwachtwoord)");
    console.error("en zet ze in .env.local, of draai met --dry om te zien wat dit zou opvragen.");
    process.exit(1);
  }

  let totaal = 0;
  for (const o of onderdelen) {
    console.log(`\n${"=".repeat(70)}\n${o.titel}\n${"=".repeat(70)}`);
    const r = await roep(o.endpoint, o.taken);
    totaal += r.kosten;
    console.log(`kosten: $${r.kosten.toFixed(4)}`);
    if (!r.ok) {
      for (const f of r.fouten) console.log(`  FOUT: ${f}`);
      continue;
    }
    if (r.resultaten.length === 0) {
      console.log("  geen resultaten — dat is een antwoord, geen fout");
      continue;
    }
    console.log(JSON.stringify(r.resultaten, null, 2).slice(0, 4000));
  }
  console.log(`\n${"=".repeat(70)}`);
  console.log(`totale kosten van deze run: $${totaal.toFixed(4)}`);
}

// Geen top-level await: tsx compileert dit script naar CommonJS en dat
// ondersteunt het niet. Vandaar een main() met een expliciete catch, zodat een
// afgekeurde belofte ook echt een exitcode oplevert in plaats van stil te falen.
async function main(): Promise<void> {
  if (droog) toonDroog();
  else await draai();
}

main().catch((e) => {
  console.error(`onverwachte fout: ${(e as Error).message}`);
  process.exit(1);
});
