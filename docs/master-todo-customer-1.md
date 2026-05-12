# Master TODO — pad naar customer #1 (Di 2026-05-19)

Stand: na sessie 2026-05-08e (28 commits geshipped, pricing volledig
4-talig, alle customer-#1 docs af). Vandaag is Do 2026-05-08. Customer
#1 over **11 dagen**.

Onderverdeling per **tijdvenster** + **eigenaar**. Niet per categorie.
Beweeg van boven naar onder; alles boven jouw huidige tijd is af of
loopt vandaag.

---

## 🟢 Klaar (geen actie meer nodig)

- ✅ Code launch-clean (PR #12, 358/358 tests)
- ✅ DEUS-SHARED sync PR #1 (CRM-app spiegel)
- ✅ Customer-#1 docs-stack (first-day-script, FAQ, support-runbook,
      execution-plan, audit-script, rehearsal-runbook)
- ✅ Pricing-page LIVE in 4 locales, 100% native vertaald
- ✅ Pricing regen-pipeline (CSV → TS + Markdown)
- ✅ Side-letter draft (€99 lifetime lock template)
- ✅ Hetzner cutover-runbook + rollback-condities
- ✅ Vrijdag execution-plan + preview-audit-script

---

## 🔴 Vandaag — Do 8 mei (eind van de dag)

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Stop met code-werk. Slaap goed. | ~30 min | Juan |
| 2 | Lees `docs/launch-execution-plan-2026-05-09.md` één keer door | 10 min | Juan |
| 3 | Telefoon op stille, koffie klaarzetten voor 09:00 morgen | 2 min | Juan |

---

## 🟡 Vrijdag 9 mei — rehearsal-dag

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | **09:00–13:00:** doorloop `docs/launch-execution-plan-2026-05-09.md` | 4u | Juan |
| 2 | 90 min audit per `docs/preview-audit-script-2026-05-09.md` | binnen 4u | Juan |
| 3 | Issue-log invullen tijdens elke fase | doorlopend | Juan |
| 4 | 12:00–12:30: pricing-beslissing definitief | 30 min | Juan |
| 5 | 12:30–13:00: customer-mail concept (Mail A go vs Mail B uitstel) | 30 min | Juan |
| 6 | Beslis: "Most popular"-tier — Pro (huidig) of Business? | 5 min | Juan |
| 7 | Hash 1-regel update | 2 min | Juan |
| 8 | **Niet 's avonds verder werken** | — | Juan |

**Issue-triage matrix:**
- 0 KRIT + HIGH → Mail A (go pad)
- 1-5 KRIT + HIGH → fix vandaag, Mail A
- 6+ → Mail B (uitstel naar Wo 20 mei)

---

## 🟡 Weekend 10-11 mei — soft-prep

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Legal entity beslissen: confirmeer Juan Diaz LLC of NL-BV | 30 min | Juan |
| 2 | KvK + adres invullen in 4 _drafts/legal/ docs | 15 min | Juan |
| 3 | Side letter naar bedrijfsjurist sturen voor review (€150-300) | 10 min | Juan |
| 4 | Backup-restore drill (1 uur) — bewijs dat je data terug kunt halen | 1u | Juan |
| 5 | Hetzner GEX44 status checken — provisioned + SSH-key in Robot | 15 min | Juan |
| 6 | DNS-TTL voor cutover-records verlagen naar 300s | 10 min | Juan |

---

## 🟡 Ma 12 — Wo 14 mei — week-1-content-week

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Side letter terug van jurist, redlines verwerken | 1-2u | Juan |
| 2 | LinkedIn launch-post finetuning (NL+EN concept klaar) | 30 min | Juan |
| 3 | DEUS-SHARED PR #1 mergen (Hash review) | 10 min | Hash |
| 4 | PR #12 mergen wanneer pricing-keuze definitief | 5 min | Juan |
| 5 | Welkomstmail customer #1 finaliseren | 30 min | Juan |
| 6 | "Most popular"-tier-vlip implementeren als beslist (1-regel-change) | 5 min | Juan |
| 7 | Mail naar legal entity-prospect (BV-oprichting) als nog niet | 1u | Juan |

---

## 🔴 Do 14 mei — pre-cutover-checklist (T-1 dag)

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Hetzner SSH-test: `ssh deus@<IP> echo ok` | 5 min | Juan |
| 2 | B2-bucket bevestigd: `deus-backups-eu` werkt + app-key in 1Password | 10 min | Juan |
| 3 | Postgres-backup vanuit Supabase getest | 30 min | Juan |
| 4 | DNS-edit-access getest (login bij registrar werkt) | 5 min | Juan |
| 5 | Status-pagina op "Scheduled maintenance Friday 21:00" | 5 min | Juan |
| 6 | Hash SMS-bereikbaarheid bevestigd voor cutover-venster | 2 min | Juan |
| 7 | Alle env vars in `MANUAL_TASKS.md` afgevinkt | 15 min | Juan |

---

## 🔴 Vr 15 mei 21:00 CET — Hetzner cutover

Volg `docs/hetzner-cutover-runbook.md`. Korte versie:

| Tijd | Actie |
|---|---|
| **T-2u (19:00)** | Postgres-dump → B2 bucket. Customer #1 weet niet hiervan. |
| **T-0 (21:00)** | Vercel pause. Caddy + Postgres bootstrap op Hetzner. DNS flip. |
| **T+30m (21:30)** | Health-check loop. Login-test. Stripe webhook URL update. |
| **T+90m (22:30)** | **Go/no-go beslismoment.** Health groen + login werkt + test-deal → DONE. Anders rollback. |
| **Za 03:00** | Maintenance window sluit. Status-pagina groen. |

**Rollback-triggers** (terug naar Vercel binnen 5 min):
- Health 3× faalt → rollback
- Auth-migratie loss-rate >1% → rollback
- Postgres-restore >15 min → rollback

**Communicatie**: Hash krijgt SMS bij start + finish. Customer #1
krijgt NIETS over het cutover-venster (irrelevante details).

---

## 🟡 Za 16 + Zo 17 mei — recovery + customer-mail-prep

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Smoke-test productie-omgeving (login, deal-create, OAuth) | 1u | Juan |
| 2 | Welkomstmail naar customer #1 finaliseren | 30 min | Juan |
| 3 | First-10-FAQ link in welkomstmail | 5 min | Juan |
| 4 | Customer-#1 contact-info bevestigd (telefoon, email) | 5 min | Juan |

---

## 🔴 Ma 18 mei 21:00 — invite-send

| # | Actie | Tijd | Eigenaar |
|---|---|---|---|
| 1 | Verstuur invite via `/philly/settings/team` om 21:00 sharp | 5 min | Juan |
| 2 | SMS naar customer #1: "Mail verstuurd, check spam, tot morgen 09:00" | 1 min | Juan |
| 3 | Open `/philly/audit` op telefoon — verifieer invite-row bestaat | 2 min | Juan |
| 4 | Telefoon op stille modus, niet op vliegtuig | — | Juan |

---

## 🔴 Di 19 mei 09:00 — Customer #1 GO-LIVE

Volg `docs/customer-1-first-day-script.md`. Tijd-blokken:

| Tijd | Wat klant doet | Wat jij doet |
|---|---|---|
| **09:00** | Opent invite-mail, klikt link, zet wachtwoord | Refresh `/philly/audit` elke 2 min |
| **09:02-09:15** | Wizard step 1-4 (profiel/org/branche/team) | Niets actief, audit-log open |
| **09:15-09:25** | OAuth kalender connecten | SMS check-in om 09:25 |
| **09:25-09:30** | Wizard finish, dashboard | Welkomstoast verschijnt |
| **09:30-10:00** | Eerste actie (contact, deal, of CSV-import) | Audit-log monitoren |
| **10:00** | — | **SMS proactieve check-in:** "Heb je 't aan de praat?" |
| **16:00** | — | **Check-in call 5 min:** wat deed je / wat raar / wat mis je |

---

## 🟡 Eerste 30 dagen post-launch — support-fase

Volg `_drafts/operator/support-runbook-first-30d.md`. Korte versie:

| Frequentie | Actie |
|---|---|
| **Elke werkdag 09:00** | `/philly/audit` triage (5 min) |
| **Elke vrijdag 17:00** | Support-log update + patroon-analyse (15 min) |
| **Elke maandag 09:00** | Plan komende week + nudge naar open-mails (10 min) |
| **Eind 30d (Do 18 jun)** | Maand-end review 1-pager (1u) |

---

## 🟠 Pending, niet-blocker voor 19 mei

Deze items hoeven NIET af voor customer #1, maar bouwen wel op de
roadmap:

| Item | Wanneer | Eigenaar |
|---|---|---|
| `/signup` flow bouwen (CTAs nu naar /contact) | week 3-4 na launch | Juan |
| Pricing-toggle (monthly/annual radio) | v2 if customer-feedback vraagt | Juan |
| Cell-waarden lokaliseren ("Unlimited" → "Onbeperkt") | v2 if customer-feedback | Juan |
| Opsera-hook upstream-bug rapporteren of vervangen | wanneer rustig | Juan |
| Side letter NL/DE/ES vertalingen | wanneer 2e/3e taal-klant binnen | Juan |
| In-app billing-view (CRM `/settings/billing` upgrade-prompt) | post customer #3 | Juan |
| Multi-currency selector EUR/USD/GBP | wanneer eerste niet-EU klant | Juan |
| Customer logos op /pricing | wanneer 3+ klanten consent gegeven | Juan |
| Compare-to-competitor expand op /pricing | post launch | Juan |
| Auto-sync workflow naar DEUS-SHARED (push → mirror) | wanneer rustig | Juan |

---

## 🔴 Beslismomenten — hard te missen

Vier beslissingen die **vóór** een specifieke datum moeten vallen:

| Wanneer | Beslissing | Default als geen actie |
|---|---|---|
| **Vr 9 mei 12:00** | "Most popular"-tier: Pro of Business | Pro blijft |
| **Vr 9 mei 12:30** | Pricing-model: 4-tier €40 (live) of alternatief | 4-tier live blijft |
| **Vr 9 mei 12:30** | Mail A (go) of Mail B (uitstel naar Wo 20 mei) | Mail A op basis van issue-count |
| **Zo 11 mei** | Legal entity: US LLC of NL BV | KvK + adres handmatig in te vullen, BV-procedure starten als nodig |
| **Nov 2026 (M+6)** | Persoonlijke runway: full-DEUS / DEUS+consulting / fundraise-prep | Default = onbeslist = financiële druk |

---

## 📋 Status-radar — kort overzicht per onderwerp

| Onderwerp | Status | Risico |
|---|---|---|
| Code & tests | 358/358 groen, typecheck schoon | Laag |
| 4-locale pagina's | 100% native EN/NL/DE/ES | Laag |
| Pricing-page | LIVE met 110+ keys × 4 locales | Laag |
| Customer-#1 docs | Volledig | Laag |
| Hetzner cutover plan | Geschreven, niet uitgevoerd | Hoog (uitvoering Vr 15 mei) |
| Legal entity | Onbeslist, KvK leeg | Medium |
| Side letter | DRAFT, lawyer-review nodig | Medium |
| Pricing-keuze | 4-tier live, 2 oudere drafts in _drafts | Laag (3 opties klaar) |
| Persoonlijke runway | DEUS-business break-even bij klant 2 | Hoog (zonder consulting = nul in nov) |
| DEUS-SHARED sync | PR #1 mergeable, marketing-site NIET in scope | Laag |
| Opsera-hook | Patched docs-bypass + flag-touch workaround | Laag (workaround werkt) |

---

## 📁 Bestand-referenties (alles op de juiste plek)

### Operator-runbooks (Juan executes)
- `docs/launch-execution-plan-2026-05-09.md` ← VRIJDAG
- `docs/preview-audit-script-2026-05-09.md` ← VRIJDAG
- `docs/customer-1-onboarding-rehearsal.md` ← VRIJDAG context
- `docs/hetzner-cutover-runbook.md` ← VR 15 MEI 21:00
- `docs/customer-1-first-day-script.md` ← DI 19 MEI 09:00
- `_drafts/operator/support-runbook-first-30d.md` ← 19 MEI t/m 18 JUN

### Customer-facing (klant zie)
- `_drafts/onboarding/welcome-email.md` ← MA 18 MEI 21:00
- `_drafts/onboarding/first-questions-customer-en.md` ← in welkomstmail
- `app/[locale]/pricing/page.tsx` ← live op site
- `_drafts/legal/beta-side-letter-en.md` ← lawyer-review

### Strategy + data
- `_drafts/pricing/pricing-tiers.csv` ← bron-of-truth, in Sheets
- `_drafts/pricing/pricing-tiers-en.md` ← rationale + FAQ
- `_drafts/pricing/pricing-en.md` ← OLD per-seat €49/€79 (referentie)
- `_drafts/pricing/pricing-beta-en.md` ← OLD flat €99 beta (referentie)
- `scripts/regenerate-pricing.mjs` ← `npm run regen:pricing`

### Legal (KvK + adres in te vullen)
- `_drafts/legal/dpa-en.md`
- `_drafts/legal/tos-en.md`
- `_drafts/legal/privacy-en.md`
- `_drafts/legal/subprocessors-en.md`
- `_drafts/legal/beta-side-letter-en.md`

---

## ⏱️ Tijdbudget-realiteit (waar gaat je 11 dagen heen)

```
Vr 9 mei   — 4u  rehearsal + 2u customer-mail concept + 30m pricing
Za-Zo      — 4u  legal + backup-drill + side-letter-send
Ma-Wo      — 4u  legal-redlines + PR-merges + content
Do 14      — 2u  pre-cutover-checklist
Vr 15      — 6u  Hetzner cutover (20:00-02:00, maar 21-22:30 active)
Za-Zo      — 2u  smoke-test + welkomstmail finaliseren
Ma 18      — 30m invite-send
Di 19      — 3u  customer-#1 day (09-10 + 16-17 + admin)
─────────────────────────────────────────────────
Totaal:    ~26u over 11 dagen = ~2.4u/dag DEUS-werk
```

Ruimte voor ~2u/dag Kompas-werk of rust. Realistisch zonder
overwerk-piek. Als rehearsal-issues groot zijn, schuift consulting-
budget naar fix-tijd, en uitstel naar Wo 20 mei is verstandig.

---

## 🎯 Eén regel samenvatting

**Vrijdagochtend rehearsal-script draaien, weekend legal + backup,
week-1 content + PR-merges, Vrijdag-21:00 Hetzner cutover, Maandag-21:00
invite, Dinsdag-09:00 customer #1 live.** Het systeem is technisch af.
De rest is uitvoering.
