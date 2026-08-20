import { lookup } from "node:dns/promises";
import type { Bevinding } from "./audit";
import { VENTURES } from "@/lib/ventures";

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

export async function controleerVentureAdressen(
  { zoek = lookup as Zoeker, haal = fetch as Haler }: { zoek?: Zoeker; haal?: Haler } = {},
): Promise<Bevinding[]> {
  const uit: Bevinding[] = [];

  for (const v of VENTURES) {
    if (!v.external) continue;
    const host = new URL(v.external).hostname;

    try {
      await zoek(host);
    } catch (e) {
      const code = foutcode(e);
      const bestaatNiet = code === "ENOTFOUND" || code === "ENODATA";
      uit.push({
        ernst: bestaatNiet ? "fout" : "waarschuwing",
        soort: bestaatNiet ? "venture-adres-bestaat-niet" : "venture-adres-onbereikbaar",
        url: v.external,
        detail: bestaatNiet
          ? `${v.name} drukt dit adres af op /work en de homepage, maar ${host} bestaat niet in DNS (${code}).`
          : `${v.name}: DNS gaf ${code || (e as Error).message}. Kan tijdelijk zijn — kijk of hij morgen weg is.`,
      });
      continue;
    }

    try {
      const r = await haal(v.external, {
        redirect: "follow",
        signal: AbortSignal.timeout(TIME_OUT_MS),
        headers: { "user-agent": "juandiazllc-seo-audit" },
      });
      if (!r.ok) {
        uit.push({
          ernst: "waarschuwing",
          soort: "venture-adres-antwoordt-niet",
          url: v.external,
          detail: `${v.name} staat als live op /work, maar het adres geeft HTTP ${r.status}.`,
        });
      }
    } catch (e) {
      uit.push({
        ernst: "waarschuwing",
        soort: "venture-adres-onbereikbaar",
        url: v.external,
        detail: `${v.name}: ${foutcode(e) || (e as Error).message}. Kan tijdelijk zijn — kijk of hij morgen weg is.`,
      });
    }
  }

  return uit;
}
