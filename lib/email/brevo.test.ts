import { describe, it, expect } from "vitest";
import { verstuur, splitsAfzender, BREVO_URL, type Verzending } from "./brevo";

/* De fetch wordt geïnjecteerd en telt zijn aanroepen. Een uitkomst "niet
   verstuurd" is pas een meting als bewezen is dat de fetch NIET is bereikt —
   anders leest een freemail-weigering hetzelfde als een netwerk dat toevallig
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

describe("splitsAfzender", () => {
  it("haalt naam en adres uit elkaar, of geeft alleen het adres", () => {
    expect(splitsAfzender("Juan Diaz <juan@x.nl>")).toEqual({ name: "Juan Diaz", email: "juan@x.nl" });
    expect(splitsAfzender('"Juan Diaz, LLC" <juan@x.nl>')).toEqual({ name: "Juan Diaz, LLC", email: "juan@x.nl" });
    expect(splitsAfzender("<juan@x.nl>")).toEqual({ email: "juan@x.nl" });
    expect(splitsAfzender("  juan@x.nl ")).toEqual({ email: "juan@x.nl" });
  });
});

describe("verstuur", () => {
  it("zonder sleutel: no-api-key, en de fetch is niet bereikt", async () => {
    const { f, teller } = nepFetch(() => new Response("{}", { status: 201 }));
    for (const apiKey of [undefined, "", "   "]) {
      const r = await verstuur(mail, { apiKey, fetchImpl: f });
      expect(r).toEqual({ ok: false, reden: "no-api-key" });
    }
    expect(teller.aanroepen).toBe(0);
  });

  it("freemail-afzender wordt geweigerd vóór het netwerk", async () => {
    const { f, teller } = nepFetch(() => new Response("{}", { status: 201 }));
    for (const from of [
      "bongartzdiaz@gmail.com",
      "Juan Diaz, LLC <bongartzdiaz@gmail.com>",
      "x@HOTMAIL.COM",
      "Juan <x@outlook.de>",
      "x@yahoo.co.uk",
    ]) {
      const r = await verstuur({ ...mail, from }, { apiKey: "xkeysib-x", fetchImpl: f });
      expect(r).toEqual({ ok: false, reden: "freemail-sender" });
    }
    expect(teller.aanroepen).toBe(0);
    // Positieve controle: een eigen domein komt wél langs de weigering.
    expect((await verstuur(mail, { apiKey: "xkeysib-x", fetchImpl: f })).ok).toBe(true);
    expect(teller.aanroepen).toBe(1);
  });

  it("201 met messageId → ok, en het verzoek draagt sleutel en Brevo-velden", async () => {
    const { f, teller } = nepFetch(
      () => new Response(JSON.stringify({ messageId: "<202609@smtp-relay.mailin.fr>" }), { status: 201 }),
    );
    const r = await verstuur(mail, { apiKey: " xkeysib-geheim ", fetchImpl: f });
    expect(r).toEqual({ ok: true, id: "<202609@smtp-relay.mailin.fr>" });
    expect(teller.aanroepen).toBe(1);
    const init = teller.laatste!.init;
    expect(teller.laatste!.url).toBe(BREVO_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("xkeysib-geheim");
    expect(headers.Authorization).toBeUndefined();
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      sender: { name: "Juan Diaz", email: "juan@juandiazllc.com" },
      to: [{ email: mail.to }],
      replyTo: { email: mail.replyTo },
      subject: mail.onderwerp,
      textContent: mail.text,
      htmlContent: mail.html,
    });
  });

  it("2xx zonder JSON → ok met id null", async () => {
    const { f } = nepFetch(() => new Response("", { status: 202 }));
    expect(await verstuur(mail, { apiKey: "k", fetchImpl: f })).toEqual({ ok: true, id: null });
  });

  it("non-2xx → http-<status>", async () => {
    const { f } = nepFetch(() => new Response("nee", { status: 401 }));
    expect(await verstuur(mail, { apiKey: "k", fetchImpl: f })).toEqual({ ok: false, reden: "http-401" });
  });

  it("gooiende fetch → network, geen worp naar buiten", async () => {
    const { f } = nepFetch(() => {
      throw new TypeError("fetch failed");
    });
    expect(await verstuur(mail, { apiKey: "k", fetchImpl: f })).toEqual({ ok: false, reden: "network" });
  });
});
