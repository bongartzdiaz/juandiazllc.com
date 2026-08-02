// Lead-meldingen: Resend-mail + Telegram-push.
//
// Deze twee stonden tot 2026-08-02 in app/actions/contact.ts. Ze zijn hierheen
// verhuisd omdat de cal.com-webhook ze óók nodig heeft: een boeking hoort binnen
// te komen zoals een formulierinzending binnenkomt, via dezelfde kanalen.
//
// Bewust VERHUISD en niet geëxporteerd uit contact.ts. Dat bestand begint met
// "use server", en in Next wordt elke export uit zo'n bestand een server-action
// met een eigen aanroepbaar endpoint. Deze twee exporteren zou dus een publiek
// mailverzendpad openzetten.
//
// Gedrag ongewijzigd overgenomen: beide zijn stil uitgeschakeld zonder env-vars,
// en beide slikken hun fouten in. De lead staat op dat moment al in de database;
// de melding is een gemak, geen voorwaarde.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Lead notifications land in Juan's Proton inbox by default. Override
// per-environment with CONTACT_NOTIFY_TO. The lead is ALSO persisted to
// Supabase regardless, so nothing is lost even if the email hop fails.
const NOTIFY_TO = process.env.CONTACT_NOTIFY_TO ?? "diazJSBD@proton.me";
const NOTIFY_FROM = process.env.CONTACT_NOTIFY_FROM ?? "noreply@juandiazllc.com";

export type LeadNotification = {
  name: string;
  email: string;
  company: string;
  sector: string;
  message: string;
  source: string;
};

// Telegram is the instant channel next to the Resend mail: push on the
// phone the second a lead lands. Configure TELEGRAM_BOT_TOKEN (from
// @BotFather) + TELEGRAM_CHAT_ID (your own chat with the bot) — both
// unset means silent no-op, same contract as the Resend hop.
export async function notifyTelegram(payload: LeadNotification) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return; // silently no-op if not configured

  // Plain text, no parse_mode — lead fields are user input and Telegram
  // Markdown/HTML parsing on untrusted text is an injection foot-gun.
  const text =
    `🟢 Nieuwe lead — juandiazllc.com\n\n` +
    `Naam:    ${payload.name || "(niet ingevuld)"}\n` +
    `Email:   ${payload.email}\n` +
    `Bedrijf: ${payload.company || "(niet ingevuld)"}\n` +
    `Sector:  ${payload.sector || "(niet ingevuld)"}\n` +
    `Bron:    ${payload.source}\n\n` +
    `${payload.message}`.slice(0, 3900); // Telegram cap is 4096 chars

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // Swallow — the row is safe in Supabase, the push is a nicety.
  }
}

export async function notifyEmail(payload: LeadNotification) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // silently no-op if not configured

  const subject = `New contact — ${payload.name || payload.email}${payload.company ? " @ " + payload.company : ""}`;
  const text =
    `New blueprint-call request from juandiazllc.com\n\n` +
    `Name:    ${payload.name || "(not provided)"}\n` +
    `Email:   ${payload.email}\n` +
    `Company: ${payload.company || "(not provided)"}\n` +
    `Sector:  ${payload.sector || "(not provided)"}\n` +
    `Source:  ${payload.source}\n\n` +
    `Message:\n${payload.message}\n`;

  try {
    await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: payload.email,
        subject,
        text,
      }),
    });
  } catch {
    // Swallow — the row is safe in Supabase, email is just a nicety.
  }
}
