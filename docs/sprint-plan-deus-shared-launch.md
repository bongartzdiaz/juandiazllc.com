# Sprint plan — DEUS-SHARED launch sprint

**Window:** Friday 2026-05-09 → Friday 2026-05-22 (two calendar weeks).
**Sprint goal:** customer #1 onboarded on the production deployment of
DEUS, code source = `bongartzdiaz/DEUS-SHARED`, infrastructure =
Hetzner Falkenstein.

**One-line success criterion:** by Friday 2026-05-22, a paying or
pre-paying real operator can sign in to `app.lucenai.eu`, complete
the wizard, connect a calendar, drop a real contact, and stay live
through a working day without anyone touching the box.

---

## Sprint scope

Frozen scope. Anything not listed here ships **after** the sprint, no
exceptions. The launch date is the discipline that makes the launch
real; widening the scope mid-sprint is how MVP launches die.

### In scope
1. Merge PR #12 (juandiazllc.com main).
2. Final Sync Bot run → DEUS-SHARED catches up.
3. Verify DEUS-SHARED parity (clone, install, build, test, all green).
4. Operator-side env vars in production.
5. Legal entity confirmed; legal docs published.
6. Hetzner cutover ceremony Friday 2026-05-15.
7. Repo split: Sync Bot disabled, CODEOWNERS guardrail in place.
8. Customer #1 picked, warmed, onboarded.
9. v1.0 release notes published on the marketing site (or a
   dedicated subdomain).

### Out of scope (defer to v1.1+ sprint)
- Two-way calendar write-back. Roadmap v1.1.
- AI Attributes on contacts. Roadmap v1.2.
- SWR rollout across `/philly/*`. Roadmap v1.3.
- NL / DE / ES translations of the launch release notes. Post-launch
  sprint, low priority.
- 4 MED + 7 LOW polish items from `/audit-full` 2026-05-08. Sweep
  bundle in week 3 if there's bandwidth.
- Bundle D4 (event persistence + Art. 9 controls). Roadmap v1.2.
- Brand split (`juandiazllc.com → lucen.ai`). Separate sprint.
- Per-tenant database deployment (Option B from the server spec).
  Triggered by the second customer or a contractual requirement.

---

## Capacity

| Role | Resource | Estimated hours |
|---|---|---|
| Founder (Juan) | Full-time | 50-60 hours over 2 weeks |
| Co-owner (Hash) | Part-time | 10-15 hours over 2 weeks |
| Claude (this session) | On-demand | Bounded by what gets surfaced |

Net usable time: ~70 hours of human-time. Sprint scope below fits
inside ~50 hours, leaving ~20 hours of buffer for the unknowns.

---

## Phases

Five phases, one calendar-anchored, four time-boxed. Each phase has
explicit done-criteria; advancing without all criteria green is a
flag.

### Phase 1 — Pre-cutover (Mon 12 – Thu 15 May, ~16h)

Objective: every item that is NOT the cutover ceremony itself is
closed by Thursday evening.

| Task | Owner | Hours | Deliverable |
|---|---|---|---|
| Confirm legal entity (NL BV / US LLC / eenmanszaak) | Juan | 0.5 | Decision noted in `_drafts/legal/entity-decision-memo.md` |
| Notary call if NL BV path | Juan | 1.0 | KvK appointment booked |
| Fill `[KvK TBD]` and `[address TBD]` placeholders in legal drafts | Juan + Claude | 1.0 | All four `_drafts/legal/*.md` ready to publish |
| Run env-vars walkthrough end-to-end | Juan or Hash | 2.0 | All 12 env vars in Vercel + 3 on Hetzner box |
| Order Hetzner GEX44 if not yet done | Juan | 0.5 | Box reachable via SSH |
| Operator SSH ed25519 key into Hetzner Robot | Juan | 0.25 | Key visible in Robot UI |
| DNS: TTL drop to 60s on `app.lucenai.eu` and wildcard | Juan | 0.5 | Confirmed via dig |
| B2 EU bucket + scoped Application Key | Juan | 0.5 | Bucket created, key exported to `/home/deus/.deus-backup-env` |
| Add Hetzner OAuth callback URL to Google Cloud Console (alongside live URL) | Juan | 0.25 | Both URLs listed in OAuth client |
| Add Hetzner OAuth callback URL to Microsoft Entra (alongside live URL) | Juan | 0.25 | Both URLs listed |
| Pick customer #1 + send first-touch email | Juan | 1.0 | Email sent from `_drafts/onboarding/customer-prospect-email.md` |
| Customer #1 reply received, beta-cohort offer sent | Juan | 1.0 | "Yes I want to be customer #1" in writing |
| Merge PR #12 to `juandiazllc.com main` | Juan | 0.25 | Branch merged, CI green |
| Trigger final Sync Bot run | Juan | 0.5 | DEUS-SHARED HEAD timestamp newer than merge |
| Verify DEUS-SHARED parity (clone + npm ci + tests + build) | Juan | 1.5 | All four green |
| If parity fails: fix-forward in DEUS-SHARED | Juan + Claude | 2.0 buffer | Tests pass on DEUS-SHARED main |
| Bootstrap Hetzner box (`01-bootstrap.sh` per runbook) | Juan | 1.5 | SSH as `deus` works, Postgres + MariaDB + Caddy up |
| Postgres + Lucia schema applied (`02-`, `03-`) | Juan | 0.5 | DBs reachable, tables exist |
| Test Postgres + MariaDB dumps to B2 (`08-backup-cron.sh` once-off) | Juan | 0.5 | First backup file in B2 |

**Total:** ~15.5 hours over 4 days. Ample slack.

**Phase 1 Definition of Done:**
- [ ] PR #12 merged, DEUS-SHARED at parity.
- [ ] All env vars set in production.
- [ ] Hetzner box bootstrapped, ready for app deploy.
- [ ] Legal entity confirmed, drafts ready to publish.
- [ ] Customer #1 has agreed to be customer #1.
- [ ] All three OAuth client registrations have BOTH callback URLs.
- [ ] B2 bucket reachable from the box.

### Phase 2 — Cutover ceremony (Fri 15 May, 21:00 CET, ~3h)

Objective: production traffic on the new box, customers unaware of
the change.

Strict per `docs/hetzner-cutover-runbook.md`. Not relitigating the
sequence here — the runbook is the authoritative checklist. Sprint-
level addenda only:

- **Operator-go check at 20:30 CET:** all Phase 1 done-criteria
  green. If anything is red, postpone to next Friday — do not ship
  on red.
- **Smoke window:** 21:00 → 23:00 CET. `09-smoke-test.sh` must pass
  10/10. Anything below 10/10 = rollback per runbook §6 step 6.
- **Communicate to customer #1 in advance** that there might be a
  brief window (target zero, realistic ≤5 minutes) during the DNS
  flip. They've already agreed; this is courtesy.
- **Phase 2 closes** when the box has been green for 12 continuous
  hours (Saturday 09:00 CET).

**Phase 2 Definition of Done:**
- [ ] Smoke tests 10/10.
- [ ] App responds at `app.lucenai.eu` over TLS.
- [ ] Health endpoint reports all dependencies OK for ≥12 hours.
- [ ] Customer #1 can sign in (verified by Juan from a fresh
      browser).

**Rollback contingency:** runbook §6, step 6. If we roll back, the
sprint slips by exactly one week; reschedule cutover to Friday
2026-05-22, customer onboarding to Tuesday 2026-05-26.

### Phase 3 — Stabilisation + repo split (Sat 16 – Sun 17 May, ~6h)

Objective: green box, sources of truth split cleanly, future commits
go to the right repo.

| Task | Owner | Hours |
|---|---|---|
| Disable external Sync Bot (per `docs/repo-split-cutover.md` §3) | Juan | 0.5 |
| Verify Sync Bot stopped (push trivial commit to juandiazllc.com, confirm DEUS-SHARED untouched 30 min later) | Juan | 0.5 |
| Add CODEOWNERS to juandiazllc.com (`app/philly/**`, `lib/philly/**`, `prisma/schema.prisma`) | Juan | 0.5 |
| Branch protection rule on juandiazllc.com main: require CODEOWNERS review | Juan | 0.25 |
| Add CODEOWNERS to DEUS-SHARED for `app/[locale]/**` (defensive) | Juan | 0.25 |
| Update `CLAUDE.md` to reflect post-split state | Juan or Claude | 0.5 |
| Update `DEPLOY.md` for DEUS-SHARED-as-source | Juan | 0.5 |
| Update `ONBOARDING.md` for new contributors | Juan | 0.5 |
| Publish legal docs from `_drafts/legal/*.md` to live paths | Juan | 1.0 |
| Verify privacy@, security@, hello@ inboxes route somewhere | Juan | 0.5 |
| Status bird's-eye check: is anything red on the box after 24h? | Juan | 0.5 |

**Total:** ~5.5 hours.

**Phase 3 Definition of Done:**
- [ ] Sync Bot stopped, verified.
- [ ] CODEOWNERS in place on both repos.
- [ ] Legal docs live at `app.lucenai.eu/legal/{privacy,tos,dpa,subprocessors}`.
- [ ] Doc set updated to reflect the split.

### Phase 4 — Customer #1 onboarding (Mon 18 – Tue 19 May, ~6h)

Objective: customer #1 lives in DEUS, in a real workflow, by Tuesday
EOD.

| Task | Owner | Hours |
|---|---|---|
| Send welcome email from `_drafts/onboarding/customer-prospect-email.md` §3 | Juan | 0.25 |
| Live-onboarding session with customer #1 (screen-share or in-person) | Juan | 1.5 |
| Walk customer through industry pick → pipeline seed → calendar connect → first contact + first deal | Juan | as part of session |
| Be on standby Monday afternoon for any "stuck" moment | Juan | 1.0 |
| Tuesday morning: sanity-check customer #1 logged in again, no friction | Juan | 0.25 |
| Capture customer #1's first impressions in writing for the retro | Juan | 0.5 |
| Update memory: `project_first_customer.md` with name, vertical, sign-up date, observed friction | Juan | 0.5 |

**Total:** ~4 hours.

**Phase 4 Definition of Done:**
- [ ] Customer #1 has used DEUS for ≥1 working session.
- [ ] No reported errors that would block productive use.
- [ ] First friction-points captured for v1.1 backlog.

### Phase 5 — Monitoring + prep for customer #2 (Wed 20 – Fri 22 May, ~8h)

Objective: prove the box stays green under one real customer; line
up customer #2; sweep up loose ends.

| Task | Owner | Hours |
|---|---|---|
| Daily watchdog check (pm2, Caddy, MariaDB, Postgres, B2 backups) | Juan | 0.25 × 5 |
| Weekly metrics pull: error rate, p95 latency, B2 backup size delta | Juan | 0.5 |
| Send Phase 5 status to Hash (mid-week) | Juan | 0.25 |
| Pick customer #2; send first-touch email | Juan | 1.0 |
| Sweep: 4 MED + 7 LOW polish items from `/audit-full` (Claude) | Claude | 4.0 — runs in background while monitoring |
| Translate v1.0 release notes to NL (highest-impact locale) | Claude | 1.0 |
| Friday retro: `/retro` skill, what worked, what to fix for customer #2 | Juan + Hash | 1.0 |

**Total:** ~9 hours, mostly distributed across the three days.

**Phase 5 Definition of Done:**
- [ ] Box has been continuously green for ≥7 days.
- [ ] Backups verified for ≥7 days.
- [ ] Customer #2 has agreed to onboard.
- [ ] Audit-cleanup bundle merged.
- [ ] Retro doc filed under `docs/retros/2026-05-22.md`.

---

## Day-by-day calendar

```
Mon 12 May    Phase 1 — Operator setup day
              Legal entity, env vars, customer-prospect outreach.

Tue 13 May    Phase 1 — Hetzner pre-flight
              Box ordered+bootstrapped, DNS TTL drop, B2 setup.

Wed 14 May    Phase 1 — Code + DEUS-SHARED parity
              PR #12 merge, final Sync Bot run, parity verified,
              DBs initialised on Hetzner.

Thu 15 May    Phase 1 — Slack + dry run
              Buffer day for anything not done. Optional dry-run
              cutover with DNS pointing at the box but TTL still
              high.

Fri 15 May    Phase 2 — Cutover ceremony (21:00 CET)
              Hetzner deploys from DEUS-SHARED.

Sat 16 May    Phase 3 — 12h watch + split prep
              Sync Bot disabled, CODEOWNERS applied.

Sun 17 May    Phase 3 — Docs + legal publish
              Legal docs live, doc set updated.

Mon 18 May    Phase 4 — Customer #1 onboarding session

Tue 19 May    Phase 4 — Standby + sanity check

Wed 20 May    Phase 5 — Monitoring, customer #2 outreach

Thu 21 May    Phase 5 — Polish bundle, NL release notes

Fri 22 May    Phase 5 — Retro, customer #2 confirmation,
              sprint close.
```

---

## Risks and mitigations

Ranked by impact × probability.

### R1 — Hetzner cutover rolls back (HIGH × MED)
**Trigger:** smoke tests <10/10 within the 2-hour window, or
customer-reported regression in the 12h watch.
**Mitigation:** clean rollback path in runbook §6. Sprint slips by
exactly one week, no permanent damage. Plan customer #1 onboarding
provisionally for Tuesday 2026-05-26 in case.

### R2 — Sync Bot drops something during the final translation (HIGH × LOW)
**Trigger:** parity check (clone + npm ci + npm test + npm run build)
fails on DEUS-SHARED.
**Mitigation:** Phase 1 builds in 2h of buffer for fix-forward in
DEUS-SHARED before the cutover. If unfixable in that window, postpone
cutover by one week.

### R3 — Legal entity question takes longer than expected (MED × MED)
**Trigger:** Notary appointment unavailable in week 1; KvK takes
weeks.
**Mitigation:** soft-launch under existing US LLC (Option B from the
decision memo), add SCC fallback to DPA, plan BV migration in Q3.
Net effect: zero sprint slip.

### R4 — Customer #1 cools off (MED × LOW)
**Trigger:** customer goes quiet between first-touch and onboarding.
**Mitigation:** have customer #2 in the warm pipeline. If #1 cools,
#2 becomes #1. Don't push the launch date to chase a soft customer.

### R5 — Hidden integration regression on the box (MED × LOW)
**Trigger:** an OAuth callback fails because we forgot a config item;
a Stripe webhook 4xx's because the secret is wrong.
**Mitigation:** smoke-test 09 covers this. Phase 1 dry-run Thursday
catches anything missed in Wednesday's parity check.

### R6 — One operator out sick during the cutover window (LOW × LOW)
**Trigger:** flu hits on Friday.
**Mitigation:** runbook is operator-executable by either Juan or Hash.
Document KVM credentials so the other can step in.

---

## Definition of Done — sprint level

The sprint is "done" when **all** of the following are true:

1. Customer #1 has used DEUS for at least one working session.
2. The box has been continuously green for ≥7 days post-cutover.
3. Legal docs are published at live paths.
4. Sync Bot is disabled; CODEOWNERS in place.
5. Customer #2 has agreed to onboard.
6. Retro doc is filed.
7. No HIGH or KRITIEK findings open from any audit run during the
   sprint.

**The sprint is NOT done if:**
- The box has been live <7 days when the sprint window closes
  (extend by the missing days, do not declare done early).
- Customer #1 onboarded but reported a blocking error that's still
  open (treat as a blocker, fix forward, don't close the sprint).
- Sync Bot is still running because we couldn't find the trigger
  (leave the sprint open; this is exactly the kind of latent state
  retros catch).

---

## Communication

| Cadence | Audience | Channel | Owner |
|---|---|---|---|
| Daily 09:00 CET | Juan + Hash | WhatsApp standup, 3 lines: yesterday / today / blockers | Juan |
| Friday 16:00 CET | Juan + Hash | Weekly digest, what shipped + what's at risk | Juan |
| Cutover-day | Customer #1 (advance notice) | Personal email | Juan |
| Cutover-day live | Juan + Hash | Voice call open during ceremony | Both |
| Post-launch +7d | Customer #1 | Check-in email + NPS-style "what's working / what isn't" | Juan |

---

## Sprint backlog vs roadmap

The frozen scope above is the **sprint backlog**. Everything below
is the **roadmap** — explicitly NOT in this sprint:

```
v1.1  (post-launch)   Two-way calendar sync (write-back)
v1.2  (June)          AI Attributes on contacts
v1.3  (June)          SWR rollout across /philly/*
v1.4  (Q3)            Per-tenant database deployment (Option B)
v2    (Q3)            Native mobile app (TBD platform)
v2    (Q3)            Marketing site rebrand to lucen.ai
v2    (Q4)            SOC 2 Type II readiness
v3    (2027)          Multi-region active-active replication
```

Reviewing the roadmap is part of Friday 22 May's retro.

---

## Document control

| Item | Value |
|---|---|
| Sprint window | Friday 2026-05-09 → Friday 2026-05-22 |
| Sprint owner | Juan Diaz |
| Co-owner | Hash |
| Method | Time-boxed sprint with frozen scope |
| Reviews | Daily standup (3 lines), weekly digest Friday |
| Closing ritual | Friday 22 May `/retro` |
| Post-sprint review | Monday 25 May, plan v1.1 sprint |
| Confidence in delivery | HIGH on code; MEDIUM on the legal-entity question; HIGH on the customer if #1 stays warm |
| Reversibility | Cutover has a clean rollback. Repo split has a half-day reverse path. Customer #1 onboarding is conversational, no contract until they say yes. |

The sprint is conservative on purpose. We have one shot at the first
customer; over-running by a week is cheaper than rushing and
rolling back.
