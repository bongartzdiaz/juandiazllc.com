import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { notifyEmail, notifyTelegram, type LeadNotification } from "@/lib/notify";
import { calBodySchema, handtekeningKlopt, tekst, type CalBody } from "@/lib/cal-webhook";

/* ---------------------------------------------------------------
   Cal.com-webhook — een boeking wordt een lead
   ---------------------------------------------------------------
   Een boeking van 15 minuten hoort in dezelfde `leads`-tabel te landen als een
   contactformulier, en via dezelfde meldingen binnen te komen. Anders heb je
   twee kanalen die je allebei apart moet controleren, en dat gaat mis op de dag
   dat je het druk hebt.

   BEVEILIGING — dit endpoint is publiek bereikbaar.
   Cal.com ondertekent elke levering met HMAC-SHA256 over de RAUWE body, in de
   header x-cal-signature-256. Zonder die controle is dit een open schrijfpad
   naar de leadtabel: iedereen die de URL kent kan rijen aanmaken en jou mail en
   Telegram-pushes sturen. De handtekening wordt daarom gecontroleerd vóór de
   body wordt geparseerd, en met een constante-tijdvergelijking.

   Bron voor het schema: cal.com/docs/developing/guides/automation/webhooks
   (nagetrokken 2026-08-02).
   --------------------------------------------------------------- */

// Runtime expliciet: node, want de edge-runtime heeft node:crypto niet.
export const runtime = "nodejs";

const SECRET_ENV = "CAL_WEBHOOK_SECRET";

export async function POST(req: Request) {
  const secret = process.env[SECRET_ENV];
  if (!secret) {
    // Niet 500: er is niets stuk, er is iets niet geconfigureerd. Zelfde
    // contract als de Stripe- en Resend-paden elders in dit project.
    console.warn(`[cal] ${SECRET_ENV} niet gezet — webhook geweigerd`);
    return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  }

  // RAUW lezen. req.json() zou de body normaliseren en dan klopt de HMAC niet
  // meer met wat cal.com heeft ondertekend.
  const rauw = await req.text();

  if (!handtekeningKlopt(rauw, req.headers.get("x-cal-signature-256"), secret)) {
    console.warn("[cal] ongeldige of ontbrekende handtekening — niets geschreven");
    return NextResponse.json({ ok: false, error: "bad-signature" }, { status: 401 });
  }

  let body: CalBody;
  try {
    body = calBodySchema.parse(JSON.parse(rauw));
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-payload" }, { status: 400 });
  }

  const { triggerEvent, payload } = body;

  // Idempotentie op cal.com's boeking-uid. Webhooks worden herhaald — bij een
  // trage response, bij een deploy, of gewoon omdat cal.com het opnieuw
  // probeert. Zonder deze controle levert elke herhaling een tweede lead en een
  // tweede Telegram-push op.
  const bestaand = await queryOne<{ id: string }>(
    `select id from leads where metadata->>'cal_uid' = $1 limit 1`,
    [payload.uid],
  );

  if (triggerEvent === "BOOKING_CANCELLED") {
    // Een afzegging is informatie, geen vergissing: de lead blijft staan en
    // wordt gemarkeerd. Wie boekte en daarna afzei is nog steeds iemand die
    // interesse had.
    if (!bestaand) return NextResponse.json({ ok: true, note: "onbekende boeking" });
    // `||` voegt server-side samen. De vorige versie las metadata uit, breidde
    // het in JS uit en schreef het geheel terug — bij twee gelijktijdige
    // webhooks overschrijft de laatste dan de eerste. Nu niet meer.
    await query(
      `update leads set metadata = coalesce(metadata, '{}'::jsonb) || $2::jsonb where id = $1`,
      [bestaand.id, JSON.stringify({ cal_cancelled_at: new Date().toISOString() })],
    );
    return NextResponse.json({ ok: true, cancelled: true });
  }

  if (triggerEvent !== "BOOKING_CREATED") {
    // Onbekende gebeurtenis: 200, anders blijft cal.com drie dagen herhalen voor
    // iets waar we bewust niets mee doen.
    return NextResponse.json({ ok: true, ignored: triggerEvent });
  }

  if (bestaand) return NextResponse.json({ ok: true, duplicate: true });

  const responses = payload.responses as Record<string, unknown> | undefined;
  const email = (tekst(responses, "email") || payload.attendees?.[0]?.email || "").toLowerCase();
  if (!email) {
    // leads.email is NOT NULL. Zonder adres kunnen we niets vastleggen, en dan
    // is 200 eerlijker dan een eindeloze retry-lus.
    console.warn(`[cal] boeking ${payload.uid} zonder e-mailadres — overgeslagen`);
    return NextResponse.json({ ok: true, skipped: "no-email" });
  }

  const lead: LeadNotification = {
    name: tekst(responses, "name") || payload.attendees?.[0]?.name || "",
    email,
    company: tekst(responses, "company", "bedrijf"),
    sector: tekst(responses, "sector", "branche"),
    // De kwalificerende vraag. Valt terug op de standaard-notitie van cal.com
    // zodat er ook iets staat zolang die vraag nog niet is ingesteld.
    message:
      tekst(responses, "probleem", "problem", "vraag", "notes", "additionalNotes") ||
      `Boeking: ${payload.title ?? "15 minuten"}`,
    source: "cal_15min",
  };

  try {
    await query(
      `insert into leads (name, email, company, sector, message, source, metadata)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        lead.name, lead.email, lead.company, lead.sector, lead.message, lead.source,
        JSON.stringify({
          cal_uid: payload.uid,
          cal_start: payload.startTime ?? null,
          // Herkomst uit de boekingslink (fase 3) landt hier zodra die wordt
          // meegegeven; cal.com zet onbekende query-params in de responses.
          herkomst: tekst(responses, "herkomst", "bron") || null,
        }),
      ],
    );
  } catch (error) {
    // WEL 500: hier is echt iets stuk en cal.com mag het opnieuw proberen.
    console.error("[cal] lead-insert faalde", error);
    return NextResponse.json({ ok: false, error: "insert-failed" }, { status: 500 });
  }

  // Meldingen zijn best-effort en mogen de webhook nooit laten falen. Deed dat
  // wel, dan zou cal.com blijven herhalen voor een lead die al is opgeslagen —
  // en elke herhaling zou opnieuw proberen te mailen.
  await Promise.all([notifyEmail(lead), notifyTelegram(lead)]);

  return NextResponse.json({ ok: true, uid: payload.uid });
}
