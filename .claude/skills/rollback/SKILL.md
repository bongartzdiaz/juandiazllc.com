---
name: rollback
description: Rollback van een gefaalde of foute deploy naar een eerdere stabiele versie. Werkt met rollback-tags van /deploy. Gebruik wanneer iets stuk is sinds laatste deploy en je snel terug wilt.
trigger: /rollback
---

# /rollback

Rollback naar eerdere stabiele versie.

## Usage

```
/rollback <target>                       # naar laatste rollback-tag
/rollback <target> <tag-of-sha>          # specifieke versie
/rollback <target> --list                # toon beschikbare rollback points
/rollback <target> --dry-run
```

## Flow

### 1. Identificeer target
- Welk systeem (hmb-site, pt, voltafy, edge-fn:X, agent:X)?
- Wat is huidige versie/SHA?
- Welke rollback points beschikbaar (`git tag -l "rollback-<target>-*"` oplopend)

### 2. Confirm met Juan
TOON:
- Van: <huidige SHA + commit message + datum>
- Naar: <target SHA + commit message + datum>
- Diff summary: N files changed, +N -N
- Wat ging er mis sinds <target SHA>? (laatste 5 commits)

Vraag: "Doorgaan met rollback? [j/n]"

### 3. Execute per target
- **HMB site:** `git checkout <sha> && npm ci && npm run build && pm2 reload`
- **PT (Vercel):** `vercel rollback <deployment-url>` of redeploy van eerdere SHA
- **Edge function:** redeploy van vorige versie (Supabase houdt versies)
- **Agent:** ssh + git checkout + pm2 restart
- **DB migration:** GEEN auto-rollback — vraag of er een down-migration is, anders STOP

### 4. Smoke test
Zelfde checks als /deploy stap 4. Als smoke FAIL na rollback: KRITIEK escalate Juan.

### 5. Notify
```
⏪ ROLLBACK <target>
Van: <SHA-was>
Naar: <SHA-now>
Reden: <opgegeven reden>
Smoke: PASS/FAIL
Volgende stap: fix forward in branch <X>
```

### 6. Memory log
Append to `project_deploys_<jaarmaand>.md`:
- ROLLBACK timestamp, target, from_sha, to_sha, reason

### 7. Open follow-up issue
Suggereer: GitHub issue met label `post-rollback` met:
- Wat ging mis
- Welke commit/PR introduceerde het
- Wie pakt fix forward op

## Hard rules
- NOOIT zonder confirm
- NOOIT DB-rollback zonder down-migration (data loss risk)
- ALTIJD smoke test na rollback
- ALTIJD memory updaten
- Bij rollback van HMB met content: check geen artikelen verdwijnen die `published` waren
- Force-push naar main NIET nodig — rollback via revert commit of redeploy oude SHA
