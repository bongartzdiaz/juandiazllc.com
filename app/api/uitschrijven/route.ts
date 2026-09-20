import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { maakLimiet, sleutelUitVerzoek } from "@/lib/verzoeklimiet";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
import { SCAN_PAD, type ScanTaal } from "@/lib/lekkage-scan-taal";
import { taalVan } from "@/lib/email/scan-reeks";

/* Uitschrijven van de scan-mails.
 *
 * De inschrijving (app/actions/scan-opvang.ts) zet een UUID als
 * `metadata.unsub_token` in de rij van `marketing.subscribers`. Elke mail
 * draagt onderaan een link naar deze route met dat token; wie klikt wordt
 * gemarkeerd met `metadata.unsubscribed_at`. De campagnes selecteren op
 * `source = 'lekkage-scan'` én het ontbreken van dat veld — een rij wordt dus
 * niet verwijderd, want dan kan hetzelfde adres via het formulier stil terug
 * op de lijst komen. Telecommunicatiewet 11.7 eist dat afmelden net zo
 * eenvoudig is als aanmelden; één klik, geen inlog, geen bevestiging.
 *
 * Gemodelleerd op app/api/newsletter/confirm/route.ts: dezelfde rem, dezelfde
 * UUID-controle, dezelfde 302 naar een pagina in plaats van een kale JSON.
 * De service-sleutel is nodig omdat `anon` op deze tabel alleen INSERT mag;
 * ontbreekt hij, dan gooit createServiceClient() en antwoordt de route 503
 * in plaats van stil "uitgeschreven" te zeggen tegen iemand die dat niet is.
 *
 * De bestemming volgt de taal van de rij (`metadata.locale`): nl → de
 * Nederlandse scanpagina, en/de → /tools/leak-scan (sinds 2026-09-20), alles
 * anders → Nederlands, zoals vóór die datum elke rij was. Het pad komt uit
 * SCAN_PAD en de taal wordt tegen ENKELE_TAAL gecontroleerd, zodat de
 * redirect niet naar een 404 kan wijzen. Vóór de rij gelezen is (ongeldig
 * token) is er geen taal, en dan is het Nederlands. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Bestemming per taal, gecontroleerd tegen ENKELE_TAAL. Een taal die de
 *  route daar niet draagt valt terug op Nederlands. */
function bestemming(taal: ScanTaal): string {
  const pad = SCAN_PAD[taal];
  const draagt = ENKELE_TAAL[pad]?.locales.includes(taal);
  return draagt ? `/${taal}${pad}` : `/nl${SCAN_PAD.nl}`;
}

const limiet = maakLimiet({
  capaciteit: Number(process.env.UITSCHRIJVEN_RATE_CAPACITY ?? 20),
  perSeconde: 0.2,
});

export type UitschrijfStatus = "klaar" | "ongeldig";

function redirectTo(req: NextRequest, status: UitschrijfStatus, taal: ScanTaal = "nl") {
  const url = new URL(bestemming(taal), req.nextUrl.origin);
  url.searchParams.set("uitgeschreven", status);
  return NextResponse.redirect(url, 302);
}

export async function GET(req: NextRequest) {
  if (!limiet.toestaan(sleutelUitVerzoek(req))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!UUID_RE.test(token)) {
    return redirectTo(req, "ongeldig");
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    // Geen service-sleutel: fail-closed en luid, zoals /api/cal.
    return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  }

  try {
    const { data: row, error: selectErr } = await admin
      .from("subscribers")
      .select("id, metadata")
      .eq("metadata->>unsub_token", token)
      .maybeSingle();

    if (selectErr || !row) {
      return redirectTo(req, "ongeldig");
    }

    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const taal = taalVan(metadata);

    // Idempotent: een tweede klik op dezelfde link is geen fout.
    if (typeof metadata.unsubscribed_at === "string") {
      return redirectTo(req, "klaar", taal);
    }

    const { error: updateErr } = await admin
      .from("subscribers")
      .update({ metadata: { ...metadata, unsubscribed_at: new Date().toISOString() } })
      .eq("id", row.id);

    if (updateErr) {
      // Geen adres in het log: de foutmelding van Supabase draagt dat niet,
      // en het id is genoeg om de rij terug te vinden.
      console.error("[uitschrijven] update failed:", updateErr.message);
      return redirectTo(req, "ongeldig", taal);
    }

    return redirectTo(req, "klaar", taal);
  } catch (e) {
    console.error("[uitschrijven] exception:", e instanceof Error ? e.message : "unknown");
    return redirectTo(req, "ongeldig");
  }
}
