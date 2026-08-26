import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  AUTHOR_IMAGE_URL,
  AUTHOR_IMAGE_FALLBACK_URL,
  ORG_LOGO_URL,
} from "./branding";

/* -------------------------------------------------------------------------
   Gate: elke branding-afbeelding moet daadwerkelijk geserveerd worden.

   WAAROM

   AUTHOR_IMAGE_URL / AUTHOR_IMAGE_PATH wezen naar `/me/portrait.jpg`, een
   bestand dat niet bestaat (public/me/ bestaat niet). Gemeten 2026-08-12 gaf
   die URL 404 op productie, en de JSON-LD op elke pagina verwees er via
   Organization.image en Person.image naar — plus /about's og:image. Google
   diskwalificeert een entiteit met een niet-crawlbare `image`.

   De bestaande SEO-audit ziet dit niet: die controleert of JSON-LD *parseert*,
   niet of de afbeelding *bestaat*. Deze test doet dat wél, puur op het
   bestandssysteem — geen netwerk.

   Een pad telt als "wordt geserveerd" als het OF een bestand in public/ is, OF
   een gegenereerde Next-route (app/<naam>.tsx of app/<naam>/route.ts).
   ------------------------------------------------------------------------- */

const ROOT = process.cwd();

/** Haal het pad-deel uit een absolute of relatieve asset-URL. */
function toPath(urlOrPath: string): string {
  try {
    return new URL(urlOrPath).pathname;
  } catch {
    return urlOrPath; // was al een pad
  }
}

/** Wordt dit pad daadwerkelijk geserveerd — als public-bestand of als route? */
function isServed(p: string): boolean {
  const rel = p.replace(/^\//, "");
  // 1. statisch bestand in public/
  if (existsSync(join(ROOT, "public", rel))) return true;
  // 2. Next metadata-bestand: app/icon.svg, app/favicon.ico e.d. worden als
  //    statisch asset op / geserveerd. Geverifieerd 2026-08-12: /icon.svg = 200.
  if (existsSync(join(ROOT, "app", rel))) return true;
  // 3. gegenereerde route: app/<naam>.tsx of app/<naam>/route.ts
  if (existsSync(join(ROOT, "app", `${rel}.tsx`))) return true;
  if (existsSync(join(ROOT, "app", rel, "route.ts"))) return true;
  if (existsSync(join(ROOT, "app", `${rel}.ts`))) return true;
  return false;
}

describe("branding-afbeeldingen bestaan", () => {
  const gevallen: [string, string][] = [
    ["AUTHOR_IMAGE_URL", AUTHOR_IMAGE_URL],
    ["AUTHOR_IMAGE_FALLBACK_URL", AUTHOR_IMAGE_FALLBACK_URL],
    ["ORG_LOGO_URL", ORG_LOGO_URL],
  ];

  for (const [naam, waarde] of gevallen) {
    it(`${naam} wijst naar een geserveerd asset, geen 404`, () => {
      const p = toPath(waarde);
      expect(
        isServed(p),
        `${naam} = ${waarde} → pad ${p} bestaat niet in public/ en is geen ` +
          `Next-route. Dit levert een 404 op in JSON-LD/OG. Wijs naar een ` +
          `bestaand asset (bv. /opengraph-image of een bestand in public/).`,
      ).toBe(true);
    });
  }
});
