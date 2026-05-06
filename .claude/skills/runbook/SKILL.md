---
name: runbook
description: Genereer een operationele runbook — voor on-call, incident-response, deploy-procedure, jaarlijkse renewals, system-recovery. Voor Roy/Noah/Juan zelf. Output volgt format dat onder druk werkt: 3-2-1 (3 commands, 2 checks, 1 escalatie). Gebruik wanneer Juan een nieuwe operationele flow documenteert of bestaande proces formaliseert.
trigger: /runbook
---

# /runbook

Operationele documentatie die werkt om 03:00 's nachts onder druk. Geen prose, alleen handelingen.

## Usage
```
/runbook <onderwerp>
/runbook <onderwerp> --type <incident|deploy|recovery|maintenance|onboarding>
/runbook <onderwerp> --owner <juan|roy|noah|on-call>
```

## Format-rules

- **Stappen genummerd** met expected output
- **Commands copy-pasteable** — geen `<your-server>` placeholder zonder tabel met waarden
- **Verify-step na elke change** — "expect: ..." regel
- **Rollback expliciet** — wat doen als stap mislukt
- **Escalatie-pad** — wie bellen na 5 min stuck

## Template

```markdown
# Runbook: <Onderwerp>

**Owner:** <Juan / Roy / on-call>  
**Last verified:** <datum>  
**Frequency:** <ad-hoc / weekly / yearly>  
**Estimated duration:** <5min / 1h / ...>

## When to run
- <Trigger 1: bv. "Lighthouse score onder 70 op homepage">
- <Trigger 2>

## Pre-requisites
- [ ] SSH-toegang naar VPS 165.232.82.71
- [ ] Supabase service-role key in `.env.local`
- [ ] Slack-webhook URL beschikbaar

## Procedure

### Stap 1 — <wat>
```bash
ssh root@165.232.82.71 "pm2 status"
```
**Expected:** alle 13 NEXUS-agents `online`. Als niet → stap 2.

### Stap 2 — <wat>
```bash
ssh root@165.232.82.71 "pm2 restart nexus-bos"
```
**Expected:** `[PM2] [nexus-bos](id) ✓`. Wacht 30s.

### Stap 3 — Verify
```bash
curl -fsS https://api.nexus.example/health
```
**Expected:** `{"status":"ok","agents":13}`

## On failure

| Stap faalt | Doe dit |
|---|---|
| Stap 1 SSH timeout | Check DigitalOcean dashboard — droplet status |
| Stap 2 pm2 niet vindbaar | `npm i -g pm2` opnieuw |
| Stap 3 health 5xx | Check logs: `pm2 logs nexus-bos --lines 50` |

## Rollback
Als procedure de status verergert:
```bash
ssh root@165.232.82.71 "pm2 stop nexus-bos && pm2 start /root/nexus-bos/last-known-good.config.js"
```

## Escalation
Na 5 min stuck of bij P1: bel Juan (06-...). Slack-channel: #incidents.

## Post-action
- [ ] Update incident-log in vault: `40-Logboek/<datum>.md`
- [ ] Slack `#incidents`: "<incident> resolved at <tijd>"
- [ ] Als 2e voorval deze maand: schedule postmortem
```

## Voorbeeld-runbooks die elke ops-stack heeft

| Naam | Owner | Frequency |
|---|---|---|
| `pt-deploy.md` | Roy | per push naar main |
| `hmb-content-publish.md` | Juan | dagelijks |
| `incident-site-down.md` | on-call | ad-hoc |
| `incident-supabase-degraded.md` | on-call | ad-hoc |
| `cron-failure-triage.md` | Roy | weekly |
| `messagebird-credit-topup.md` | Juan | monthly |
| `ssl-cert-renewal.md` | Roy | yearly |
| `database-backup-restore.md` | Roy | yearly drill |
| `wabA-meta-registratie.md` | Juan | one-time |
| `new-team-member-onboarding.md` | Juan | per persoon |

## Hard rules

### Geschikt voor "om 3:00 onder druk"
- Geen narrative prose — bullets en commands
- Geen "consider..." of "you might want to..." — beslis vooraf
- Geen externe links naar tutorials — embed essential

### Versioning
- `Last verified` datum bovenaan — als >6 maanden oud → drill om te checken of nog werkt
- Owner-veld duidelijk wie 'm onderhoudt
- Bij wijziging: bump `Last verified`

### Veiligheid
- Geen secrets in runbook — verwijs naar password-manager
- Geen `--force` of destructieve commands zonder expliciete waarschuwing
- Backup-stap vóór destructieve actie

## Combineer met
- `/incident` — bij actuele incident, runbook is de procedure
- `/handoff` — overdracht inclusief relevante runbooks
- `/deploy` — voor deploy-specifieke procedures
- `/backup-verify` — voor backup-runbook validatie
