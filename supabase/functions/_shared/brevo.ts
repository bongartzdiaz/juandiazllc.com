/* Eén mail versturen via Brevo (transactional API). Dun, zonder SDK.
 *
 * Verving lib/email/resend.ts op 2026-09-20. Dezelfde aanroepvorm, dezelfde
 * uitkomsten, andere leverancier. Dit bestand is BYTE-IDENTIEK aan
 * supabase/functions/_shared/brevo.ts, zodat de edge functions
 * (ontvangstbevestiging, interne melding) en de campagne (Next.js-cron)
 * hetzelfde doen en dezelfde weigeringen kennen. lib/email/gedeeld.test.ts
 * houdt de twee gelijk; daarom staat hier geen enkele import.
 *
 * Wat de helper weigert VÓÓR er iets de deur uit gaat:
 *   - geen sleutel → `no-api-key`;
 *   - een afzender op een gratis maildomein (gmail, hotmail, outlook, yahoo)
 *     → `freemail-sender`. Brevo staat dat toe, maar de DMARC-regels van die
 *     domeinen laten mail die niet van hun eigen servers komt in de spam
 *     belanden of terugstuiteren. Een afzender hoort op een in Brevo
 *     geauthenticeerd domein (DKIM + DMARC op juandiazllc.com).
 *
 * `fetchImpl` is injecteerbaar zodat de test geen netwerk nodig heeft en
 * kan tellen of er werkelijk iets is verstuurd. Een lege uitkomst uit een
 * kapot instrument leest anders hetzelfde als een schone meting. */

export const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type Verzending = {
  /** `Naam <adres>` of kaal adres. */
  from: string;
  to: string;
  replyTo: string;
  onderwerp: string;
  text: string;
  html: string;
};

export type VerzendOpties = {
  apiKey: string | undefined;
  fetchImpl?: typeof fetch;
};

export type VerzendResultaat =
  | { ok: true; id: string | null }
  | { ok: false; reden: "no-api-key" | "freemail-sender" | `http-${number}` | "network" };

export const FREEMAIL_RE =
  /@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|proton|protonmail)\.[a-z.]+>?\s*$/i;

/** `Juan Diaz <juan@juandiazllc.com>` → { name: "Juan Diaz", email: "juan@juandiazllc.com" }. */
export function splitsAfzender(from: string): { name?: string; email: string } {
  const m = /^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/.exec(from);
  if (m) {
    const name = (m[1] ?? "").trim();
    return name ? { name, email: m[2].trim() } : { email: m[2].trim() };
  }
  return { email: from.trim() };
}

export async function verstuur(
  mail: Verzending,
  opties: VerzendOpties,
): Promise<VerzendResultaat> {
  const apiKey = opties.apiKey?.trim();
  if (!apiKey) return { ok: false, reden: "no-api-key" };
  if (FREEMAIL_RE.test(mail.from)) return { ok: false, reden: "freemail-sender" };

  const doFetch = opties.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(BREVO_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: splitsAfzender(mail.from),
        to: [{ email: mail.to }],
        replyTo: { email: mail.replyTo },
        subject: mail.onderwerp,
        textContent: mail.text,
        htmlContent: mail.html,
      }),
    });
  } catch {
    return { ok: false, reden: "network" };
  }

  if (!res.ok) return { ok: false, reden: `http-${res.status}` };

  let id: string | null = null;
  try {
    const body = (await res.json()) as { messageId?: unknown };
    if (typeof body.messageId === "string") id = body.messageId;
  } catch {
    // Geen JSON terug is geen mislukte verzending; de status was 2xx.
  }
  return { ok: true, id };
}
