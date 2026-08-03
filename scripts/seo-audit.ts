/* Technische SEO-audit — crawler en rapport.
   ───────────────────────────────────────────────────────────────────────────
   Draaien:
     npx tsx scripts/seo-audit.ts                     tegen productie
     npx tsx scripts/seo-audit.ts http://localhost:3200
     npx tsx scripts/seo-audit.ts --json > audit.json

   Kost niets: het crawlt alleen je eigen sitemap. Geen API, geen sleutel.

   Exitcode 1 zodra er een fout in zit, zodat dit in CI kan draaien. Losse
   waarschuwingen laten de exitcode met rust — anders wordt hij genegeerd.
   ─────────────────────────────────────────────────────────────────────────── */

import { auditAlles, telPerErnst, type Pagina, type Bevinding } from "../lib/seo/audit";
import { LOCALES } from "../lib/i18n/dict";

const args = process.argv.slice(2);
const alsJson = args.includes("--json");
const basis = (args.find((a) => a.startsWith("http")) ?? "https://juandiazllc.com").replace(/\/$/, "");

/** Volgt redirects met de hand zodat de keten zichtbaar blijft. */
async function haalOp(url: string, maxHops = 5): Promise<Pagina> {
  const keten = [url];
  let huidig = url;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(huidig, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return { url, status: res.status, keten, html: "" };
      huidig = new URL(loc, huidig).toString();
      keten.push(huidig);
      continue;
    }
    return { url, status: res.status, keten, html: res.status === 200 ? await res.text() : "" };
  }
  return { url, status: 508, keten, html: "" };
}

async function main(): Promise<void> {
  const xml = await (await fetch(`${basis}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .map((u) => u.replace(/^https?:\/\/[^/]+/, basis));

  if (urls.length === 0) {
    console.error(`Geen URL's gevonden in ${basis}/sitemap.xml`);
    process.exit(1);
  }

  if (!alsJson) console.error(`${urls.length} URL's ophalen van ${basis} …`);

  // Vijf tegelijk: genoeg om het snel te houden, weinig genoeg om de eigen
  // server niet plat te leggen tijdens een lokale run.
  const paginas: Pagina[] = [];
  const rij = [...urls];
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      for (let u = rij.shift(); u; u = rij.shift()) {
        try {
          paginas.push(await haalOp(u));
        } catch (e) {
          paginas.push({ url: u, status: 0, keten: [u], html: "" });
          if (!alsJson) console.error(`  ${u}: ${(e as Error).message}`);
        }
      }
    }),
  );

  const bevindingen = auditAlles(paginas, basis, [...LOCALES]);
  const telling = telPerErnst(bevindingen);

  if (alsJson) {
    console.log(JSON.stringify({ basis, paginas: paginas.length, telling, bevindingen }, null, 2));
  } else {
    rapporteer(paginas.length, telling, bevindingen);
  }

  process.exit(telling.fout > 0 ? 1 : 0);
}

function rapporteer(
  aantal: number,
  telling: ReturnType<typeof telPerErnst>,
  bevindingen: Bevinding[],
): void {
  console.log(`\n${"═".repeat(72)}`);
  console.log(`Technische SEO-audit — ${aantal} pagina's`);
  console.log(`${"═".repeat(72)}`);
  console.log(`fouten: ${telling.fout}   waarschuwingen: ${telling.waarschuwing}   notities: ${telling.notitie}\n`);

  if (bevindingen.length === 0) {
    console.log("Niets gevonden. Dat is een uitkomst, geen fout in het script —");
    console.log("de controles zijn getest in lib/seo/audit.test.ts.");
    return;
  }

  const perSoort = new Map<string, Bevinding[]>();
  for (const b of bevindingen) perSoort.set(b.soort, [...(perSoort.get(b.soort) ?? []), b]);

  const volgorde: Record<string, number> = { fout: 0, waarschuwing: 1, notitie: 2 };
  const gesorteerd = [...perSoort.entries()].sort(
    (a, b) => volgorde[a[1][0].ernst] - volgorde[b[1][0].ernst] || b[1].length - a[1].length,
  );

  for (const [soort, lijst] of gesorteerd) {
    const merk = lijst[0].ernst === "fout" ? "FOUT" : lijst[0].ernst === "waarschuwing" ? "LET OP" : "NOTITIE";
    console.log(`${merk}  ${soort} — ${lijst.length}×`);
    for (const b of lijst.slice(0, 8)) {
      console.log(`    ${b.url.replace(basis, "") || "/"}`);
      console.log(`      ${b.detail}`);
    }
    if (lijst.length > 8) console.log(`    … en nog ${lijst.length - 8}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(`onverwachte fout: ${(e as Error).message}`);
  process.exit(1);
});
