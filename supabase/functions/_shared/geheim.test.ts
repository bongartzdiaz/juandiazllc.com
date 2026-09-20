import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { geheim } from "./geheim.ts";

Deno.test("env-var wint en Vault wordt dan niet gelezen", async () => {
  let n = 0;
  const v = await geheim(" uit-env ", "x", () => { n++; return Promise.resolve({ data: "vault", error: null }); });
  assertEquals(v, "uit-env");
  assertEquals(n, 0);
});

Deno.test("zonder env uit Vault, onder de gevraagde naam", async () => {
  let naam = "";
  const v = await geheim(null, "lead_notify_secret", (nm) => { naam = nm; return Promise.resolve({ data: "geheim", error: null }); });
  assertEquals(v, "geheim");
  assertEquals(naam, "lead_notify_secret");
});

Deno.test("fout, leeg of geen string → null", async () => {
  assertEquals(await geheim(undefined, "x", () => Promise.resolve({ data: null, error: { code: "42501" } })), null);
  assertEquals(await geheim("", "x", () => Promise.resolve({ data: " ", error: null })), null);
  assertEquals(await geheim("", "x", () => Promise.resolve({ data: 7, error: null })), null);
});
