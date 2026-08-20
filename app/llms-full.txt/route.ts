import { bouwLlmsFullTxt } from "@/lib/seo/llms";

/* De volledige tekst van elk Engelstalig artikel en elke marktnotitie in één
 * bestand. `/llms.txt` is de index; dit is de inhoud.
 *
 * WAAROM ALLEEN ENGELS. `getAllInsights("en")` levert wat er onder /en staat.
 * De markt-specifieke clusters (NL saldering, DE Heimspeicher, ES autoconsumo)
 * zijn met opzet `markets: ["nl"|"de"|"es"]` en staan niet onder /en — ze hier
 * meenemen zou een assistent Engelse URL's opleveren die 404 geven. Dezelfde
 * keuze als in feed.json, om dezelfde reden. */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return new Response(bouwLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
