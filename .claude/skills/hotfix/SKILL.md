---
name: hotfix
description: Emergency patch flow voor productie — minimal change, rollback-tag, smoke test, snel deployen. Gebruik wanneer er nu een fix moet, niet via volledige /deploy flow met PR review.
trigger: /hotfix
---

# /hotfix

Emergency patch zonder de volledige deploy ceremonie. Wel veilig: rollback-tag + smoke test.

## Usage

```
/hotfix <repo> <kort beschrijving>
# vb: /hotfix performancetracker fix CORS preflight
# vb: /hotfix helpmijbesparen revert broken schema
```

## Wanneer hotfix vs deploy?

| Hotfix | Deploy |
|---|---|
| Productie kapot, loss/risk loopt nu | Geplande change |
| <30 LOC change | Feature werk |
| Rollback van vorige deploy | New code |
| Config / env-only change | Code review wenselijk |

## Flow

### 1. Pre-check
- Git status clean? (geen uncommitted toxic state mengen met hotfix)
- Is er al een actieve incident? (zie /incident)
- Welke severity?

### 2. Branch
```bash
git checkout main && git pull
git checkout -b hotfix/<datum>-<topic>
```

### 3. Tag rollback BEFORE wijziging
```bash
git tag rollback-pre-hotfix-<topic>-<timestamp>
git push origin rollback-pre-hotfix-<topic>-<timestamp>
```
Dit is je veiligheidsnet — `/rollback` kan hier naartoe.

### 4. Make change
- Smallest possible change
- Geen "while I'm here" cleanup
- Geen format/lint pass die regels muteert

### 5. Local sanity check
- Lint indien snel
- Type check indien snel
- Run de specifieke test die het probleem dekt (indien aanwezig)

### 6. Commit + push
```
git add -p   # NIET -A
git commit -m "hotfix: <topic>

<korte why>

Rollback tag: rollback-pre-hotfix-<topic>-<timestamp>"
git push origin hotfix/<datum>-<topic>
```

NOOIT --no-verify zonder Juan's expliciete go.

### 7. Deploy
Per repo type:
- **Vercel/Netlify**: merge of push naar main → auto deploy
- **VPS (NEXUS / HMB site)**: `pm2 reload <process>` na pull
- **Edge function**: via `/edge-fn-deploy`
- **Supabase migration**: apply via mcp tool, NIET prod direct

### 8. Smoke test (verplicht)
- Reproduceer originele bug → moet nu OK zijn
- Test 2-3 critical user paths die NIET hoorden te breken
- Check error rate eerste 10 min na deploy

### 9. Communicate
- Update incident channel / Slack
- Note in `logboek_<datum>.md`
- Memory: `project_hotfix_<datum>_<topic>.md`

### 10. Follow-up taak
- TODO: proper fix? cleanup? unit test toevoegen?
- Schrijf naar memory zodat het niet verdwijnt

## Output format

```
═══ HOTFIX — <repo> ═══

Branch: hotfix/<datum>-<topic>
Rollback tag: rollback-pre-hotfix-<topic>-<TS>

CHANGE
[diff samenvatting]

PRE-DEPLOY
[ ] Lint OK
[ ] Type OK
[ ] Test pass

DEPLOY
[exact commando's gebruikt]

SMOKE
[ ] Original bug fixed
[ ] No regression in <path-A>
[ ] No regression in <path-B>

FOLLOW-UP
[ ] [item]
```

## Hard rules
- ALTIJD rollback tag VOORAF
- NOOIT direct op main pushen (branch eerst)
- NOOIT meerdere fixes in 1 hotfix
- NOOIT --no-verify zonder go
- NOOIT skip smoke test omdat "klein"
- ALTIJD memory save na

## Gerelateerd
- `/deploy` — normale flow
- `/rollback` — restore naar tag
- `/incident` — als dit reageert op incident
