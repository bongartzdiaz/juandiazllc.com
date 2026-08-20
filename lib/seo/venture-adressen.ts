import { lookup } from "node:dns/promises";
import type { Bevinding } from "./audit";
import { VENTURES } from "@/lib/ventures";
import { AFFILIATIE_NAAM, AFFILIATIE_URL } from "@/lib/seo/branding";

/* Bestaan de adressen die we afdrukken nog?
   ───────────────────────────────────────────────────────────────────────────
   `lib/ventures.test.ts` bewaakt dat we geen adres tonen voor iets dat niet
   live is. Wat die gate niet kan zien, is een domein dat gewoon ophoudt te
   bestaan — en dat is precies wat er met philly.juandiazllc.com gebeurde:
   afgedrukt in vier talen, NXDOMAIN bij de resolver, en geen enkele test die
   erover ging. Een DNS-wijziging komt nooit langs een pull request.

   Hoort daarom in de dagelijkse productie-audit en niet in de PR-audit: daar
   is `audit` een verplichte check, en een storing bij een ander mag geen merge
   blokkeren.

   TWEE VRAGEN, TWEE INSTRUMENTEN — en dat is hier geen detail.

   "Bestaat deze naam?" is een DNS-vraag; "antwoordt hij?" is een HTTP-vraag.
   De eerste versie van deze controle leidde het eerste af uit het tweede: geen
   losse lookup, alleen kijken of `fetch` faalde met ENOTFOUND. Gemeten op
   2026-08-20 tegen de echte dode host geeft `fetch` hier
   UND_ERR_CONNECT_TIMEOUT — vermoedelijk omdat er een proxy tussen zit die zelf
   op de onbekende naam blijft hangen. De controle rapporteerde de dode host dus
   als "kan tijdelijk zijn", en dat is precies het label waarmee je hem negeert.
   `dns.lookup` geeft op dezelfde machine wél gewoon ENOTFOUND.

   ENOTFOUND is een fout: de naam bestaat niet, en dat gaat vanzelf niet over.
   Al het andere — time-out, 5xx, tijdelijke DNS-hapering — is een
   waarschuwing, want een rood dat af en toe vanzelf groen wordt leert je het
   te negeren. */

const TIME_OUT_MS = 15_000;

/** Gooit met `code: "ENOTFOUND"` wanneer de naam niet bestaat. */
type Zoeker = (host: string) => Promise<unknown>;
type Haler = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;

function foutcode(e: unknown): string {
  const d = e as { code?: string; cause?: { code?: string } };
  return d.code ?? d.cause?.code ?? "";
}

/* Twee vragen, twee instrumenten — zie de kop. Deze functie geeft het
   ruwe antwoord; de aanroeper bepaalt hoe erg het is en hoe het heet, want een
   dode venture-hostnaam en een dood affiliatie-adres vragen om een andere zin. */
type Uitkomst =
  | { soort: "goed" }
  | { soort: "bestaat-niet"; code: string }
  | { soort: "onbereikbaar"; reden: string }
  | { soort: "antwoordt-niet"; status: number };

async function bereikbaar(
  url: string,
  { zoek, haal }: { zoek: Zoeker; haal: Haler },
): Promise<Uitkomst> {
  const host = new URL(url).hostname;

  try {
    await zoek(host);
  } catch (e) {
    const code = foutcode(e);
    if (code === "ENOTFOUND" || code === "ENODATA") return { soort: "bestaat-niet", code };
    return { soort: "onbereikbaar", reden: code || (e as Error).message };
  }

  try {
    const r = await haal(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIME_OUT_MS),
      headers: { "user-agent": "juandiazllc-seo-audit" },
    });
    return r.ok ? { soort: "goed" } : { soort: "antwoordt-niet", status: r.status };
  } catch (e) {
    return { soort: "onbereikbaar", reden: foutcode(e) || (e as Error).message };
  }
}

export async function controleerVentureAdressen(
  { zoek = lookup as Zoeker, haal = fetch as Haler }: { zoek?: Zoeker; haal?: Haler } = {},
): Promise<Bevinding[]> {
  const uit: Bevinding[] = [];

  for (const v of VENTURES) {
    if (!v.external) continue;
    const r = await bereikbaar(v.external, { zoek, haal });

    if (r.soort === "bestaat-niet") {
      uit.push({
        ernst: "fout",
        soort: "venture-adres-bestaat-niet",
        url: v.external,
        detail: `${v.name} drukt dit adres af op /work en de homepage, maar ${new URL(v.external).hostname} bestaat niet in DNS (${r.code}).`,
      });
    } else if (r.soort === "onbereikbaar") {
      uit.push({
        ernst: "waarschuwing",
        soort: "venture-adres-onbereikbaar",
        url: v.external,
        detail: `${v.name}: ${r.reden}. Kan tijdelijk zijn — kijk of hij morgen weg is.`,
      });
    } else if (r.soort === "antwoordt-niet") {
      uit.push({
        ernst: "waarschuwing",
        soort: "venture-adres-antwoordt-niet",
        url: v.external,
        detail: `${v.name} staat als live op /work, maar het adres geeft HTTP ${r.status}.`,
      });
    }
  }

  return uit;
}

/* Hetzelfde instrument, ander onderwerp.
   ────────────────────────────────────────────────────────────────────────
   `AFFILIATIE_URL` staat in de JSON-LD van /about, in vier talen, en er staat
   een zichtbare link naar toe. Dat is dezelfde belofte als een venture-adres:
   wij drukken af dat dit bestaat. Een `sameAs`- of `affiliation`-adres dat 404
   geeft is geen ontbrekend signaal maar een mislukte controle — exact de reden
   waarom de dode X-handle uit `ORG_SAME_AS` is gehaald.

   Aparte functie en geen extra rij in de lijst hierboven: de zin die de
   operator moet lezen is een andere, en een venture-melding over een
   affiliatie-adres stuurt hem naar /work in plaats van naar /about. */
export async function controleerEntiteitsAdressen(
  { zoek = lookup as Zoeker, haal = fetch as Haler }: { zoek?: Zoeker; haal?: Haler } = {},
): Promise<Bevinding[]> {
  const r = await bereikbaar(AFFILIATIE_URL, { zoek, haal });

  if (r.soort === "bestaat-niet") {
    return [{
      ernst: "fout",
      soort: "entiteit-adres-bestaat-niet",
      url: AFFILIATIE_URL,
      detail: `/about draagt ${AFFILIATIE_NAAM} in \`affiliation\` en linkt er in vier talen naartoe, maar ${new URL(AFFILIATIE_URL).hostname} bestaat niet in DNS (${r.code}). Haal de link en het schemaveld weg of wijs ze naar het adres dat wel bestaat.`,
    }];
  }
  if (r.soort === "antwoordt-niet") {
    return [{
      ernst: "waarschuwing",
      soort: "entiteit-adres-antwoordt-niet",
      url: AFFILIATIE_URL,
      detail: `${AFFILIATIE_NAAM} staat in het Person-schema op /about, maar het adres geeft HTTP ${r.status}.`,
    }];
  }
  if (r.soort === "onbereikbaar") {
    return [{
      ernst: "waarschuwing",
      soort: "entiteit-adres-onbereikbaar",
      url: AFFILIATIE_URL,
      detail: `${AFFILIATIE_NAAM}: ${r.reden}. Kan tijdelijk zijn — kijk of hij morgen weg is.`,
    }];
  }
  return [];
}
