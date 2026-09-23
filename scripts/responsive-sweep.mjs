/**
 * Responsive-sweep: vindt inhoud die buiten het venster valt en wordt weggeknipt.
 *
 * WAAROM DIT BESTAAT, en niet gewoon `scrollWidth - clientWidth`:
 * `html, body` dragen `overflow-x: clip` (globals.css, bewuste keuze van
 * 2026-08-02 -- `hidden` maakt een scroll-container en breekt position:
 * sticky). Daardoor is die klassieke uitdrukking op deze site ALTIJD 0 en
 * leest een kapotte pagina als schoon. Gemeten op 2026-09-23: 902 gevallen
 * open terwijl die meter nul gaf.
 *
 * Deze sweep meet daarom elementen die buiten het venster steken. Geknipte
 * inhoud is erger dan een scrollbalk -- je kunt er niet naartoe scrollen.
 *
 * Elementen binnen een bedoelde scroll/clip-container tellen niet mee, maar de
 * wandeling stopt voor body en html, anders wist de root-clip alles uit.
 *
 * Geen dependency erbij: Node 24 draagt WebSocket ingebouwd, dus Chrome gaat
 * via het DevTools-protocol. Deze repo heeft bewust negen dependencies.
 *
 * WANNEER DRAAIEN: na elke wijziging aan de nav-kopij, de HUD, een grid of een
 * breekpunt. De breekpunten in globals.css zijn afgesteld op de BREEDSTE taal
 * (Spaans, gemeten). Groeit een vertaling, dan schuift die grens mee en ziet
 * alleen deze sweep dat -- een unittest kan geen layout meten.
 *
 * De positieve controle onderaan is niet optioneel: nullen op rij lezen net zo
 * goed als een kapot instrument. Hij spuit een element van 2000px in, meet,
 * haalt het weg en meet opnieuw.
 *
 * GEBRUIK
 *   npm run build && npx next start -p 3200
 *   curl -s http://localhost:3200/sitemap.xml \
 *     | grep -oE "<loc>[^<]+" | sed "s|<loc>https*://[^/]*||" > urls.txt
 *   node scripts/responsive-sweep.mjs urls.txt http://localhost:3200 \
 *     320,360,375,390,430,479,481,559,561,601,639,641,700,721,767,769,781,821,859,861,901,961,1025,1201,1280 \
 *     rapport.json
 *
 * Chrome-pad overschrijven kan met CHROME_PAD=...
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { verouderdeProfielen } from "./sweep-profielen.mjs";

const [urlBestand, basis, breedtenArg, uitPad] = process.argv.slice(2);
const URLS = readFileSync(urlBestand, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const BREEDTES = breedtenArg.split(",").map((n) => parseInt(n, 10));
const CHROME = process.env.CHROME_PAD
  || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const POORT = 9223;
const PROFIEL = join(tmpdir(), "sweep-profiel-" + Date.now());

// Profielen die eerdere runs hebben laten staan. Zie sweep-profielen.mjs:
// `chrome.kill()` keerde meteen terug en de `rmSync` erna botste op de
// bestandsloks van Windows, waarna een lege catch de fout opslikte.
// Gemeten op 2026-09-23: 18 profielen, samen 1,3 GB.
for (const naam of verouderdeProfielen(readdirSync(tmpdir()), Date.now(), basename(PROFIEL))) {
  try { rmSync(join(tmpdir(), naam), { recursive: true, force: true }); } catch {}
}

const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Chrome afsluiten en het profiel weghalen -- in die volgorde, en met
 * bewijs dat de eerste stap af is.
 *
 * `kill()` stuurt alleen een signaal en komt onmiddellijk terug. De oude
 * versie deed `rmSync` op de regel daarna, dus terwijl Chrome de bestanden
 * nog open had. Op Windows faalt dat, en de lege `catch {}` maakte die fout
 * onzichtbaar. Daarom nu: wachten op het werkelijke einde, daarna opnieuw
 * proberen, en klagen als het alsnog niet lukt.
 */
async function opruimen(proces) {
  if (proces && proces.exitCode === null && !proces.killed) proces.kill();
  if (proces && proces.exitCode === null) {
    await Promise.race([
      new Promise((r) => proces.once("exit", r)),
      slaap(5000), // niet eindeloos blijven hangen op een vastgelopen Chrome
    ]);
  }
  // Ook na afsluiten geeft Windows de lock niet altijd meteen vrij.
  for (let poging = 1; poging <= 5; poging++) {
    try { rmSync(PROFIEL, { recursive: true, force: true }); return true; }
    catch { await slaap(300 * poging); }
  }
  console.warn(`[sweep] profiel niet verwijderd, ruim handmatig op: ${PROFIEL}`);
  return false;
}

// ── de meting zelf ────────────────────────────────────────────────────────
// `documentElement.scrollWidth - clientWidth` werkt hier NIET. `html, body`
// dragen `overflow-x: clip` (globals.css:50, bewuste keuze van 2026-08-02:
// `hidden` maakt een scroll-container en breekt position: sticky). Daardoor
// is die uitdrukking altijd 0 en leest een kapotte pagina als schoon.
//
// Dus meten we wat er werkelijk misgaat: elementen die buiten het venster
// vallen en daar dus wórden weggeknipt. Geknipte inhoud is erger dan een
// scrollbalk -- je kunt er niet naartoe scrollen.
//
// Elementen binnen een bedoelde scroll/clip-container tellen niet mee, maar
// de wandeling stopt vóór body en html, anders wist de root-clip alles uit.
const METEN = `(() => {
  const root = document.documentElement, body = document.body;
  const vw = root.clientWidth;
  const rauw = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    // ver buiten beeld gezette toegankelijkheidstekst is geen overloop
    if (r.right < -500 || r.left > vw + 5000) continue;
    const over = Math.round(Math.max(r.right - vw, -r.left, 0));
    if (over <= 1) continue;
    let p = el.parentElement, geklemd = false;
    while (p && p !== body && p !== root) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'hidden' || ox === 'clip' || ox === 'auto' || ox === 'scroll') { geklemd = true; break; }
      p = p.parentElement;
    }
    if (geklemd) continue;
    rauw.push({ el, over, l: Math.round(r.left), rr: Math.round(r.right) });
  }
  // Een kind erft de overloop van zijn ouder. Alleen de buitenste melden,
  // anders telt één fout als dertig.
  const set = new Set(rauw.map((x) => x.el));
  const buitenste = rauw.filter((x) => {
    let p = x.el.parentElement;
    while (p && p !== body) { if (set.has(p)) return false; p = p.parentElement; }
    return true;
  });
  const beschrijf = (x) => {
    const el = x.el;
    const eigenTekst = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const interactief = !!el.closest('a,button,input,select,textarea,[role="button"]')
      || !!el.querySelector('a,button,input,select,textarea');
    return {
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '')
        + (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
      over: x.over, l: x.l, r: x.rr,
      inhoud: eigenTekst || interactief,
      tekst: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 45),
    };
  };
  const lijst = buitenste.map(beschrijf).sort((a, b) => b.over - a.over);
  return JSON.stringify({
    vw,
    overflow: lijst.length ? lijst[0].over : 0,
    aantal: lijst.length,
    inhoud: lijst.filter((x) => x.inhoud).length,
    daders: lijst.slice(0, 4),
  });
})()`;

// ── minimale CDP-client ───────────────────────────────────────────────────
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.wacht = new Map(); this.gebeurtenissen = new Map();
    ws.addEventListener("message", (e) => {
      const m = JSON.parse(e.data);
      if (m.id && this.wacht.has(m.id)) { const { res, rej } = this.wacht.get(m.id); this.wacht.delete(m.id);
        m.error ? rej(new Error(m.error.message)) : res(m.result); }
      else if (m.method) { const h = this.gebeurtenissen.get(m.method); if (h) h(m.params); }
    });
  }
  stuur(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.wacht.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.wacht.has(id)) { this.wacht.delete(id); rej(new Error("time-out " + method)); } }, 30000);
    });
  }
  bij(method, h) { this.gebeurtenissen.set(method, h); }
}

async function verbind(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });
  return new Cdp(ws);
}

// ── hoofdloop ─────────────────────────────────────────────────────────────
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  "--disable-extensions", "--hide-scrollbars",
  "--remote-debugging-port=" + POORT, "--user-data-dir=" + PROFIEL, "about:blank",
], { stdio: "ignore" });

let doelUrl = null;
for (let i = 0; i < 40 && !doelUrl; i++) {
  await slaap(500);
  try {
    const lijst = await (await fetch(`http://127.0.0.1:${POORT}/json/list`)).json();
    const pagina = lijst.find((t) => t.type === "page");
    if (pagina) doelUrl = pagina.webSocketDebuggerUrl;
  } catch {}
}
if (!doelUrl) { await opruimen(chrome); throw new Error("Chrome gaf geen debug-doel"); }

const cdp = await verbind(doelUrl);
await cdp.stuur("Page.enable");
await cdp.stuur("Runtime.enable");

let geladen = null;
cdp.bij("Page.loadEventFired", () => { if (geladen) geladen(); });

async function ga(url) {
  const klaar = new Promise((r) => { geladen = r; });
  await cdp.stuur("Page.navigate", { url });
  await Promise.race([klaar, slaap(12000)]);
  geladen = null;
  await slaap(250);
}

async function meet(breedte) {
  await cdp.stuur("Emulation.setDeviceMetricsOverride", {
    width: breedte, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await slaap(70);
  const r = await cdp.stuur("Runtime.evaluate", { expression: METEN, returnByValue: true });
  return JSON.parse(r.result.value);
}

const gevallen = [];
const fouten = [];
let gemeten = 0;
const begin = Date.now();

// Eén trage pagina mag de hele sweep niet omgooien: een gemiste meting is een
// gat in de dekking dat je moet KUNNEN ZIEN, geen reden om 4900 andere weg te
// gooien. Elke misser wordt genoteerd en aan het eind geteld.
for (const [i, pad] of URLS.entries()) {
  try {
    await ga(basis + pad);
  } catch (e) {
    fouten.push({ pad, breedte: null, fout: String(e.message).slice(0, 80) });
    continue;
  }
  for (const b of BREEDTES) {
    try {
      const m = await meet(b);
      gemeten++;
      if (m.overflow > 0) gevallen.push({ pad, breedte: b, vw: m.vw, overflow: m.overflow, aantal: m.aantal, inhoud: m.inhoud, daders: m.daders });
    } catch (e) {
      fouten.push({ pad, breedte: b, fout: String(e.message).slice(0, 80) });
    }
  }
  if (uitPad && i % 20 === 0) {
    writeFileSync(uitPad, JSON.stringify({ voortgang: `${i + 1}/${URLS.length}`, gemeten, gevallen, fouten }, null, 2));
  }
}

// ── positieve controle: vlagt de meter een echte overloop nog? ────────────
await ga(basis + URLS[0]);
await cdp.stuur("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
await slaap(70);
await cdp.stuur("Runtime.evaluate", {
  expression: `(()=>{const e=document.createElement('div');e.id='meter-controle';e.style.cssText='width:2000px;height:2px';document.body.appendChild(e);})()`,
});
await slaap(70);
const controleMet = JSON.parse((await cdp.stuur("Runtime.evaluate", { expression: METEN, returnByValue: true })).result.value);
await cdp.stuur("Runtime.evaluate", { expression: `document.getElementById('meter-controle').remove()` });
await slaap(70);
const controleZonder = JSON.parse((await cdp.stuur("Runtime.evaluate", { expression: METEN, returnByValue: true })).result.value);

const rapport = {
  urls: URLS.length,
  breedtes: BREEDTES.length,
  combinaties: gemeten,
  gemist: fouten.length,
  fouten: fouten.slice(0, 20),
  seconden: Math.round((Date.now() - begin) / 1000),
  positieve_controle: { met_breed_element: controleMet.overflow, daarna_weer: controleZonder.overflow },
  gevallen,
};

if (uitPad) writeFileSync(uitPad, JSON.stringify(rapport, null, 2));

console.log(`combinaties: ${gemeten} (${URLS.length} urls x ${BREEDTES.length} breedtes) in ${rapport.seconden}s`);
console.log(`positieve controle: met=${controleMet.overflow} zonder=${controleZonder.overflow} ` +
  (controleMet.overflow > 100 && controleZonder.overflow === 0 ? "-> meter werkt" : "-> METER VERDACHT"));
console.log(`gemist door fouten: ${fouten.length}` + (fouten.length ? ` -> ${[...new Set(fouten.map((f) => f.pad))].slice(0,5).join(", ")}` : ""));
console.log(`gevallen met overloop: ${gevallen.length}`);

const perUrl = new Map();
for (const g of gevallen) perUrl.set(g.pad, (perUrl.get(g.pad) || 0) + 1);
for (const [pad, n] of [...perUrl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  const ergste = gevallen.filter((g) => g.pad === pad).sort((a, b) => b.overflow - a.overflow)[0];
  const d = ergste.daders[0];
  const inh = ergste.daders.some((x) => x.inhoud) ? " INHOUD" : " decoratief?";
  console.log(`  ${pad}  ${n}x, ergste ${ergste.overflow}px @${ergste.vw}${inh}  ${d ? d.sel : ""} "${d ? d.tekst : ""}"`);
}

await opruimen(chrome);
process.exit(0);
