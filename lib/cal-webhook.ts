import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/* ---------------------------------------------------------------
   Cal.com-webhook — controle en uitpakken
   ---------------------------------------------------------------
   Deze twee dingen staan bewust NIET in app/api/cal/route.ts.

   Next staat in een route-bestand alleen de HTTP-methodes toe als export, dus
   alles wat daarin staat is onbereikbaar voor een test. En juist de
   handtekeningcontrole moet getest zijn: dat is het enige dat de leadtabel
   afschermt van iedereen die de URL kent.

   Schema nagetrokken op 2026-08-02 tegen
   cal.com/docs/developing/guides/automation/webhooks:
   HMAC-SHA256 over de RAUWE body, in de header x-cal-signature-256.
   --------------------------------------------------------------- */

// Cal.com stuurt antwoorden als {label, value}. Het value-type verschilt per
// veldsoort (tekst, keuze, meerkeuze), dus accepteren we breed en maken er zelf
// tekst van. Onbekende sleutels zijn toegestaan: cal.com voegt velden toe zonder
// waarschuwing en daar mag dit niet op omvallen.
const antwoord = z.object({
  label: z.string().optional(),
  value: z.unknown().optional(),
});

export const calPayloadSchema = z.object({
  uid: z.string().min(1),
  title: z.string().optional(),
  startTime: z.string().optional(),
  attendees: z
    .array(z.object({ name: z.string().optional(), email: z.string().optional() }))
    .optional(),
  responses: z.record(z.string(), z.union([antwoord, z.unknown()])).optional(),
});

export const calBodySchema = z.object({
  triggerEvent: z.string(),
  payload: calPayloadSchema,
});

export type CalBody = z.infer<typeof calBodySchema>;

/**
 * Controleert de HMAC-SHA256-handtekening van cal.com over de rauwe body.
 *
 * Constante-tijdvergelijking, niet `===`. Een gewone stringvergelijking stopt
 * bij het eerste verschillende teken, en dat verschil in looptijd is genoeg om
 * de juiste handtekening teken voor teken te raden.
 */
export function handtekeningKlopt(
  rauweBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header) return false;
  const verwacht = createHmac("sha256", secret).update(rauweBody, "utf8").digest("hex");
  const a = Buffer.from(verwacht, "utf8");
  const b = Buffer.from(header.trim().toLowerCase(), "utf8");
  // timingSafeEqual eist gelijke lengte; een lengteverschil is al een mismatch.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Haalt de tekstwaarde uit een cal.com-antwoord, ongeacht de veldsoort. */
export function tekst(
  responses: Record<string, unknown> | undefined,
  ...sleutels: string[]
): string {
  if (!responses) return "";
  for (const s of sleutels) {
    const r = responses[s] as { value?: unknown } | undefined;
    const v = r && typeof r === "object" && "value" in r ? r.value : r;
    if (Array.isArray(v)) return v.map(String).join(", ").trim();
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return "";
}
