import { describe, it, expect } from "vitest";
import { localeHref } from "./href";
import { LOCALES } from "./dict";

describe("localeHref", () => {
  it("zet de prefix voor een taalloos intern pad", () => {
    expect(localeHref("nl", "/work")).toBe("/nl/work");
    expect(localeHref("de", "/sectors/energy")).toBe("/de/sectors/energy");
  });

  it("maakt van de wortel het taalpad zelf", () => {
    expect(localeHref("es", "/")).toBe("/es");
  });

  // Twee keer toepassen mag geen /nl/nl/work opleveren. Dat gebeurt zodra een
  // component een al opgebouwd pad doorgeeft aan een tweede laag.
  it("is idempotent", () => {
    for (const l of LOCALES) {
      expect(localeHref(l, localeHref(l, "/work"))).toBe(`/${l}/work`);
      expect(localeHref(l, localeHref(l, "/"))).toBe(`/${l}`);
    }
  });

  it("raakt een pad met een andere taal niet aan", () => {
    expect(localeHref("nl", "/de/work")).toBe("/de/work");
  });

  it("laat routes buiten app/[locale] met rust", () => {
    for (const pad of ["/philly", "/philly/contacts", "/api/leads", "/auth/callback", "/rss.xml", "/feed.json", "/sitemap.xml", "/robots.txt"]) {
      expect(localeHref("nl", pad), pad).toBe(pad);
    }
  });

  // /apps mag niet meeliften op de uitzondering voor /api.
  it("verwart geen pad dat toevallig met een uitzondering begint", () => {
    expect(localeHref("nl", "/apis")).toBe("/nl/apis");
    expect(localeHref("nl", "/phillyx")).toBe("/nl/phillyx");
  });

  it("laat externe adressen, ankers en protocollen met rust", () => {
    for (const h of ["https://voltafy.nl", "http://x.nl", "//cdn.example.com/a", "mailto:juan@juandiazllc.com", "tel:+31653142656", "#contact", "?p=1"]) {
      expect(localeHref("nl", h), h).toBe(h);
    }
  });

  it("houdt query en anker intact", () => {
    expect(localeHref("nl", "/contact?bron=nav")).toBe("/nl/contact?bron=nav");
    expect(localeHref("nl", "/work#cases")).toBe("/nl/work#cases");
    expect(localeHref("nl", "/de/work?x=1")).toBe("/de/work?x=1");
  });

  it("werkt voor elke taal die de site kent", () => {
    for (const l of LOCALES) {
      expect(localeHref(l, "/contact")).toBe(`/${l}/contact`);
    }
  });
});
