/* Eén mail versturen via Resend. Dun, zonder SDK.
 *
 * Dezelfde aanroepvorm als supabase/functions/lead-acknowledge/index.ts,
 * zodat de twee verzendpaden (edge function voor de ontvangstbevestiging,
 * deze module voor de campagne) hetzelfde doen en dezelfde weigeringen
 * kennen. De belangrijkste: een afzender op `resend.dev` is de sandbox en
 * levert alleen aan het eigen account — daar hoort geen campagne vanaf te
 * gaan, dus die wordt geweigerd vóór er iets de deur uit gaat.
 *
 * `fetchImpl` is injecteerbaar zodat de test geen netwerk nodig heeft en
 * kan tellen of er werkelijk iets is verstuurd. Een lege uitkomst uit een
 * kapot instrument leest anders hetzelfde als een schone meting. */

const RESEND_URL = "https://api.resend.com/emails";

export type Verzending = {
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
  | { ok: false; reden: "no-api-key" | "sandbox-sender" | `http-${number}` | "network" };

const SANDBOX_RE = /@resend\.dev>?\s*$/i;

export async function verstuur(
  mail: Verzending,
  opties: VerzendOpties,
): Promise<VerzendResultaat> {
  const apiKey = opties.apiKey?.trim();
  if (!apiKey) return { ok: false, reden: "no-api-key" };
  if (SANDBOX_RE.test(mail.from)) return { ok: false, reden: "sandbox-sender" };

  const doFetch = opties.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mail.from,
        to: mail.to,
        reply_to: mail.replyTo,
        subject: mail.onderwerp,
        text: mail.text,
        html: mail.html,
      }),
    });
  } catch {
    return { ok: false, reden: "network" };
  }

  if (!res.ok) return { ok: false, reden: `http-${res.status}` };

  let id: string | null = null;
  try {
    const body = (await res.json()) as { id?: unknown };
    if (typeof body.id === "string") id = body.id;
  } catch {
    // Geen JSON terug is geen mislukte verzending; de status was 2xx.
  }
  return { ok: true, id };
}
