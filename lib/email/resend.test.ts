import { describe, it, expect } from "vitest";
import { verstuur, type Verzending } from "./resend";

/* De fetch wordt geïnjecteerd en telt zijn aanroepen. Een uitkomst "niet
   verstuurd" is pas een meting als bewezen is dat de fetch NIET is bereikt —
   anders leest een sandbox-weigering hetzelfde als een netwerk dat toevallig
   niet antwoordde. */

const mail: Verzending = {
  from: "Juan Diaz <juan@juandiazllc.com>",
  to: "iemand@voorbeeld.test",
  replyTo: "info@juandiazllc.com",
  onderwerp: "Test",
  text: "hoi",
  html: "<p>hoi</p>",
};

function nepFetch(antwoord: () => Response | Promise<Response>) {
  const teller = { aanroepen: 0, laatste: null as null | { url: string; init: RequestInit } };
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    teller.aanroepen += 1;
    teller.laatste = { url: String(url), init: init ?? {} };
    return antwoord();
  }) as typeof fetch;
  return { f, teller };
}

describe("verstuur", () => {
  it("zonder sleutel: no-api-key, en de fetch is niet bereikt", async () => {
    const { f, teller } = nepFetch(() => new Response("{}", { status: 200 }));
    for (const apiKey of [undefined, "", "   "]) {
      const r = await verstuur(mail, { apiKey, fetchImpl: f });
      expect(r).toEqual({ ok: false, reden: "no-api-key" });
    }
    expect(teller.aanroepen).toBe(0);
  });

  it("sandbox-afzender wordt geweigerd vóór het netwerk", async () => {
    const { f, teller } = nepFetch(() => new Response("{}", { status: 200 }));
    for (const from of ["onboarding@resend.dev", "Juan <x@resend.dev>", "x@RESEND.DEV"]) {
      const r = await verstuur({ ...mail, from }, { apiKey: "re_x", fetchImpl: f });
      expect(r).toEqual({ ok: false, reden: "sandbox-sender" });
    }
    expect(teller.aanroepen).toBe(0);
  });

  it("2xx met id → ok, en het verzoek draagt sleutel en velden", async () => {
    const { f, teller } = nepFetch(
      () => new Response(JSON.stringify({ id: "em_123" }), { status: 200 }),
    );
    const r = await verstuur(mail, { apiKey: " re_geheim ", fetchImpl: f });
    expect(r).toEqual({ ok: true, id: "em_123" });
    expect(teller.aanroepen).toBe(1);
    const init = teller.laatste!.init;
    expect(teller.laatste!.url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_geheim");
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      from: mail.from,
      to: mail.to,
      reply_to: mail.replyTo,
      subject: mail.onderwerp,
      text: mail.text,
      html: mail.html,
    });
  });

  it("2xx zonder JSON → ok met id null", async () => {
    const { f } = nepFetch(() => new Response("", { status: 202 }));
    expect(await verstuur(mail, { apiKey: "re_x", fetchImpl: f })).toEqual({ ok: true, id: null });
  });

  it("non-2xx → http-<status>", async () => {
    const { f } = nepFetch(() => new Response("nee", { status: 422 }));
    expect(await verstuur(mail, { apiKey: "re_x", fetchImpl: f })).toEqual({
      ok: false,
      reden: "http-422",
    });
  });

  it("gooiende fetch → network, geen worp naar buiten", async () => {
    const { f } = nepFetch(() => {
      throw new TypeError("fetch failed");
    });
    expect(await verstuur(mail, { apiKey: "re_x", fetchImpl: f })).toEqual({
      ok: false,
      reden: "network",
    });
  });
});
