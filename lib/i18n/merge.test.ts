import { describe, it, expect } from "vitest";
import { defined, mergeByIndex } from "./merge";

describe("defined", () => {
  it("laat undefined-sleutels weg", () => {
    expect(defined({ a: 1, b: undefined })).toEqual({ a: 1 });
    expect("b" in defined({ a: 1, b: undefined })).toBe(false);
  });

  // Dit is de reden dat er niet gewoon op waarheid gefilterd wordt: een lege
  // string of een 0 is een geldige vertaling en moet blijven staan.
  it("houdt falsy waarden die géén undefined zijn", () => {
    expect(defined({ leeg: "", nul: 0, onwaar: false, niets: null })).toEqual({
      leeg: "",
      nul: 0,
      onwaar: false,
      niets: null,
    });
  });

  it("een leeg object blijft leeg", () => {
    expect(defined({})).toEqual({});
  });

  it("muteert de invoer niet", () => {
    const bron = { a: 1, b: undefined };
    defined(bron);
    expect("b" in bron).toBe(true);
  });

  // Het gedrag dat defined() bestaat om te voorkomen.
  it("zonder de filter zou een spread de basiswaarde wissen", () => {
    const basis = { naam: "Voltafy" };
    expect({ ...basis, ...{ naam: undefined } }.naam).toBeUndefined();
    expect({ ...basis, ...defined({ naam: undefined }) }.naam).toBe("Voltafy");
  });
});

describe("mergeByIndex", () => {
  const basis = [
    { title: "Survey", body: "EN een", href: "/a" },
    { title: "Build", body: "EN twee", href: "/b" },
  ];

  it("zonder vertaling komt de basis ongewijzigd terug", () => {
    expect(mergeByIndex(basis, undefined)).toBe(basis);
  });

  it("vervangt alleen de aangeleverde velden en houdt de rest van de basis", () => {
    const r = mergeByIndex(basis, [{ body: "NL een" }, { body: "NL twee" }]);
    expect(r[0]).toEqual({ title: "Survey", body: "NL een", href: "/a" });
    expect(r[1]).toEqual({ title: "Build", body: "NL twee", href: "/b" });
  });

  // De basislengte is leidend: een kortere vertaling laat het restant op het
  // Engels staan in plaats van items te laten verdwijnen.
  it("een kortere vertaling laat de overige items intact", () => {
    const r = mergeByIndex(basis, [{ body: "NL een" }]);
    expect(r).toHaveLength(2);
    expect(r[1].body).toBe("EN twee");
  });

  it("een langere vertaling voegt niets toe", () => {
    const r = mergeByIndex(basis, [{ body: "a" }, { body: "b" }, { body: "c" }]);
    expect(r).toHaveLength(2);
  });

  it("muteert de basis niet", () => {
    mergeByIndex(basis, [{ body: "NL een" }]);
    expect(basis[0].body).toBe("EN een");
  });

  // Het typeargument is hier nodig: uit een lege array leidt TypeScript T af
  // als `never`, waardoor het vertaalitem niet toewijsbaar is.
  it("een lege basis blijft leeg", () => {
    expect(mergeByIndex<{ body: string }>([], [{ body: "x" }])).toEqual([]);
  });
});
