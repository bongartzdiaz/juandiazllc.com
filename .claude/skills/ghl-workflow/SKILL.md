---
name: ghl-workflow
description: Bouw GoHighLevel workflow JSON voor de 5 nog-te-bouwen workflows (zie project_ghl_workflows_status) of nieuwe routing. Inclusief tags, triggers, conditions, actions. Gebruik wanneer Juan een workflow wil toevoegen of een bestaande wil aanpassen.
trigger: /ghl-workflow
---

# /ghl-workflow

GHL workflow JSON builder met NEXUS BOS routing-conventies.

## Usage

```
/ghl-workflow <type> <doel>
# vb: /ghl-workflow trigger nieuwe-lead-router-v2
# vb: /ghl-workflow followup terugbellen-overdue-7d
# vb: /ghl-workflow nurture salderingsregeling-content
```

## Status workflows (project_ghl_workflows_status)
- LIVE: Router, Welcome, Lead-Magnet
- TE BOUWEN: 5 workflows nog open

Welke 5? Vraag Juan om de specifieke namen indien onduidelijk uit context.

## Workflow types

### A. Trigger / Router
Eerste contact. Routes lead naar juiste sub-workflow.
- Trigger: form submission / tag added / opportunity created
- Conditions: source, campagne, ICP-match
- Actions: tag toevoegen + start nested workflow

### B. Welcome / Opener
Eerste WhatsApp via DM Champ.
- Trigger: tag "new-lead"
- Wait: 0-5 min (delay om robotisch effect te vermijden)
- Action: webhook naar DM Champ met opener template ID
- Bekend: GHL standaard webhook ondersteunt geen vrije JSON body — gebruik Make.com intermediair indien nodig

### C. Follow-up / Re-engage
Voor stuck leads (parallel met /lead-reengage skill).
- Trigger: tag "stuck-48u" of conditional wait
- Branch op scenario (A-G uit lead-reengage)
- Action: webhook DM Champ + tag update

### D. Nurture
Voor leads in oriëntatiefase.
- Trigger: tag "nurture-thuisbatterij" of "nurture-saldering"
- Sequence: 4-6 messages over 2-3 weken
- Content: artikel-shares, niet sales

### E. Hand-off
Bot → adviseur.
- Trigger: tag "qualified"
- Actions:
  1. Notify adviseur via internal Slack
  2. Create task in GHL pipeline
  3. Update opportunity stage
  4. Archive bot conversation

### F. Pipeline-status sync
Update GHL stage op basis van outcome.
- Trigger: tag "outcome-X" (gekwalificeerd / afgewezen / terugbellen / buitendienst)
- Action: move to corresponding pipeline stage

## NEXUS BOS conventies

### Tag naming
- `source-<campagne>`: bron campaign
- `stage-<naam>`: pipeline stage
- `status-<naam>`: workflow state (gekwalificeerd / afgewezen / terugbellen / buitendienst-gepland)
- `bot-<state>`: bot conversation state
- `nurture-<topic>`: nurture sequence membership

NIET overlappende namen tussen sources zodat routing eenduidig is.

### Webhooks
- URL pattern: `https://api.dmchamp.com/webhooks/<endpoint>` (verifieer exact)
- Body: JSON met `lead_id`, `phone`, `template_id`, `vars`
- Bekend issue: GHL standaard webhook = geen vrije JSON. Use Make.com tussenstap.
- Auth: x-api-key header (geen Authorization Bearer)

### Wait times
- Tussen sequential messages: min 4u, niet meteen achter elkaar (anti-spam)
- Re-engage scenario A: 48u na last activity
- Outreach window: 09:00-21:00 (zie project_outbound_canary)

### Compliance gates
Elke action node die outbound message triggert:
- Check tag `do-not-contact` → skip
- Check 3x-nee counter → bij 3: stop workflow
- Check business hours → wait tot window

## Flow

### 1. Doel + scope
Vraag of leid af:
- Wat triggert deze workflow
- Welke conditie(s) bepalen path
- Welke acties in welke volgorde
- Wat is de exit-conditie (success / fail)

### 2. Tag plan
- Welke tags worden gelezen?
- Welke tags worden geschreven?
- Conflict met bestaande workflows?

### 3. Webhook payloads
Per webhook node:
- Endpoint URL
- Method (POST)
- Headers (x-api-key)
- Body schema

### 4. Test scenario
Voor elke branch: een test-lead profiel om te valideren.

### 5. Output: GHL JSON + uitleg

```json
{
  "name": "<workflow-naam>",
  "trigger": {
    "type": "<trigger-type>",
    "conditions": [...]
  },
  "steps": [
    {
      "id": 1,
      "type": "wait",
      "duration": "<X>"
    },
    {
      "id": 2,
      "type": "condition",
      "if": "<expr>",
      "then": [...],
      "else": [...]
    },
    {
      "id": 3,
      "type": "webhook",
      "url": "...",
      "method": "POST",
      "headers": { "x-api-key": "{{secret.dmchamp}}" },
      "body": { ... }
    },
    {
      "id": 4,
      "type": "tag",
      "action": "add",
      "tags": ["..."]
    }
  ]
}
```

### 6. Setup checklist (handmatig in GHL UI)
- [ ] Workflow aangemaakt
- [ ] Tags vooraf bestaan
- [ ] Secrets/API keys gevuld in GHL settings
- [ ] Test-mode run met dummy lead
- [ ] Bekijk delivery in DM Champ

### 7. Memory hook
Update project_ghl_workflows_status met nieuwe live-status.

## Output format

```
═══ GHL WORKFLOW — <naam> ═══

DOEL
[1-2 zin]

TRIGGER
[type + conditions]

TAG PLAN
Reads: ...
Writes: ...

STEPS
1. ...
2. ...
...

JSON
[code block]

WEBHOOKS
- [endpoint] — body: <schema>

TEST SCENARIO
- Test lead: <profiel>
- Verwachte path: ...

SETUP CHECKLIST
[ ] ...

MEMORY
Update project_ghl_workflows_status: <wijziging>
```

## Hard rules
- ALTIJD compliance gates (do-not-contact, 3x-nee, business hours)
- NOOIT outbound zonder tag-write voor traceability
- Webhooks via Make.com indien GHL JSON body limit raakt
- Test-mode eerst, NOOIT direct live op echte leads
- Memory updaten na live-zetting

## Memory check
Lees: project_ghl_workflows_status, project_outbound_canary, feedback_whatsapp_format
