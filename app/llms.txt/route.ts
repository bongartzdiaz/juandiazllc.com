import { bouwLlmsTxt } from "@/lib/seo/llms";

/* Stond tot 2026-08-20 als statisch bestand in `public/llms.txt`. Dat bestand
 * is verwijderd, en dat moest ook: Next serveert `public/` vóór een route met
 * dezelfde naam, dus met allebei had de route nooit iets gedaan.
 *
 * Alle inhoud komt uit `lib/seo/llms.ts` — zie de toelichting daar voor wat er
 * mis was met de handmatige versie. */

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return new Response(bouwLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
