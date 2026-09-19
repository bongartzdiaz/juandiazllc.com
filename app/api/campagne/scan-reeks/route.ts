import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { maakLimiet, sleutelUitVerzoek } from "@/lib/verzoeklimiet";
import { verstuur } from "@/lib/email/resend";
import {
  REEKS_BRON,
  bepaalVolgende,
  bouwMail,
  markeerVerzonden,
} from "@/lib/email/scan-reeks";
import { CONTACT_EMAIL } from "@/lib/seo/branding";

/* De cron achter de drie scan-mails.
 *
 * Vercel roept deze route dagelijks aan (vercel.json, `0 8 * * *`) met
 * `Authorization: Bearer <CRON_SECRET>`. De route leest de rijen in
 * `marketing.subscribers` met `source = 'lekkage-scan'`, laat
 * lib/email/scan-reeks.ts uitrekenen welke mail voor welke rij aan de beurt
 * is, verstuurt die via lib/email/resend.ts en schrijft de verzenddatum terug
 * in `metadata.verzonden`. Twee runs op één dag versturen niets dubbel; een
 * gemiste dag wordt de volgende run ingehaald.
 *
 * Volgorde van de poorten, bewust:
 *   1. rem          — een vreemde die de URL kent kost hooguit één vergelijking;
 *   2. CRON_SECRET  — ontbreekt of te kort → 503 not-configured, zoals /api/cal;
 *                     fout → 401. Twee antwoorden, zodat "niet ingesteld" van
 *                     "verkeerde sleutel" te scheiden is met een onschadelijke
 *                     probe;
 *   3. RESEND_API_KEY + CAMPAGNE_FROM — zonder die twee is er niets te
 *                     versturen; liever 503 dan een run die elke rij "mislukt"
 *                     meldt;
 *   4. service-sleutel — `anon` mag op deze tabel alleen INSERT, dus lezen en
 *                     bijwerken vergt de service role.
 *
 * Geen body: het is een GET, en proxy.ts laat GET op /api/* langs de
 * Origin-controle — precies wat een cron zonder Origin nodig heeft.
 *
 * Wat er NIET in het log komt: adressen. Een verzendfout logt het rij-id en de
 * reden; het id is genoeg om de rij terug te vinden. */

const limiet = maakLimiet({ capaciteit: 10, perSeconde: 0.05 });

/** Hooguit zoveel rijen per run. Drie mails per adres en één cron per dag:
 *  dit plafond is pas een beperking bij tientallen inschrijvingen per dag,
 *  en dan is het een luxeprobleem dat de volgende run inhaalt. */
const MAX_PER_RUN = 50;

const MIN_SECRET_LENGTE = 16;

function bearerKlopt(header: string | null, secret: string): boolean {
  if (!header) return false;
  const verwacht = Buffer.from(`Bearer ${secret}`, "utf8");
  const gekregen = Buffer.from(header.trim(), "utf8");
  if (verwacht.length !== gekregen.length) return false;
  return timingSafeEqual(verwacht, gekregen);
}

/** Elke 503 logt WELKE variabele ontbreekt -- alleen de naam, nooit de
    waarde of de lengte ervan. Het antwoord naar buiten blijft identiek, zodat
    een aanroeper zonder Bearer niets over de configuratie leert; het
    Vercel-runtime-log wel. Tot 2026-09-19 zwegen alle drie de takken, en was
    "503 not-configured" op productie niet te herleiden tot één variabele. */
function nietGeconfigureerd(reden: string) {
  console.warn(`[scan-reeks] not-configured: ${reden}`);
  return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
}

type Rij = { id: string; email: string; metadata: Record<string, unknown> | null };

export async function GET(req: NextRequest) {
  if (!limiet.toestaan(sleutelUitVerzoek(req))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const cronSecret = process.env.CRON_SECRET?.trim() ?? "";
  if (cronSecret.length < MIN_SECRET_LENGTE) {
    return nietGeconfigureerd(`CRON_SECRET ontbreekt of is korter dan ${MIN_SECRET_LENGTE}`);
  }
  if (!bearerKlopt(req.headers.get("authorization"), cronSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const from = process.env.CAMPAGNE_FROM?.trim() ?? "";
  if (!apiKey) return nietGeconfigureerd("RESEND_API_KEY leeg");
  if (!from) return nietGeconfigureerd("CAMPAGNE_FROM leeg");
  if (/@resend\.dev>?$/i.test(from)) {
    return nietGeconfigureerd("CAMPAGNE_FROM is een @resend.dev-sandboxadres");
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch {
    return nietGeconfigureerd("SUPABASE_SECRET_KEY ontbreekt (service client)");
  }

  const nu = new Date();
  const telling = { bekeken: 0, verzonden: 0, overgeslagen: 0, mislukt: 0 };

  const { data, error } = await admin
    .from("subscribers")
    .select("id, email, metadata")
    .eq("source", REEKS_BRON)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error("[scan-reeks] select failed:", error.message);
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  for (const rij of (data ?? []) as Rij[]) {
    telling.bekeken += 1;
    const metadata = rij.metadata ?? {};
    const nr = bepaalVolgende(metadata, nu);
    if (nr === null) {
      telling.overgeslagen += 1;
      continue;
    }

    const token = metadata.unsub_token;
    if (typeof token !== "string" || !token) {
      // Zonder token kan de mail geen afmeldlink dragen, en zonder afmeldlink
      // mag hij niet weg (Telecommunicatiewet 11.7). Rij overslaan, luid.
      console.error("[scan-reeks] rij zonder unsub_token:", rij.id);
      telling.mislukt += 1;
      continue;
    }

    const lekken = typeof metadata.lekken === "number" ? metadata.lekken : null;
    const mail = bouwMail(nr, { lekken, unsub_token: token });

    const uitkomst = await verstuur(
      { from, to: rij.email, replyTo: CONTACT_EMAIL, ...mail },
      { apiKey },
    );

    if (!uitkomst.ok) {
      console.error("[scan-reeks] verzenden mislukt:", rij.id, nr, uitkomst.reden);
      telling.mislukt += 1;
      continue;
    }

    const { error: updateErr } = await admin
      .from("subscribers")
      .update({ metadata: markeerVerzonden(metadata, nr, nu) })
      .eq("id", rij.id);

    if (updateErr) {
      // De mail is weg maar het stempel niet gezet: de volgende run zou hem
      // opnieuw sturen. Luid loggen; dit is de ene fout die dubbel kan kosten.
      console.error("[scan-reeks] stempel niet gezet:", rij.id, nr, updateErr.message);
      telling.mislukt += 1;
      continue;
    }

    telling.verzonden += 1;
  }

  return NextResponse.json({ ok: true, ...telling });
}
