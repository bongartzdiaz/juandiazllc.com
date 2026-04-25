---
slug: features/ai-command-bar
lang: en
title: AI command bar
summary: The cmdk-style command palette that turns natural-language requests into structured CRM operations — read, draft, mutate.
tags: [features, ai, command-bar, productivity]
related: [features/contacts, features/deals, features/ai-attributes]
updated: 2026-04-25
---

# AI command bar

A cmdk-style palette that takes a natural-language instruction
("summarize Marco from Acme", "move the Vista deal to negotiation",
"draft a follow-up to Sarah") and either runs it directly or queues
a confirmation step.

Open with **⌘K / Ctrl+K** from anywhere in the dashboard.

This is **not** the in-app help chat (that's `/assistant`).
The command bar runs *operations*; the assistant *answers
questions*.

## How it works

Typing into the bar sends the input to a planner LLM (Claude,
via the `ANTHROPIC_API_KEY` env var). The planner returns a
structured `plan` of one or more tool calls. The executor then
runs them in order. Read tools run immediately; write tools
require a second confirmation click.

Example: you type **"summarize Acme Corp"**. The planner
returns:

```json
{
  "steps": [
    {
      "tool": "summarize_contact",
      "args": { "identifier": "Acme Corp" },
      "rationale": "User asked for a summary of a contact named Acme Corp."
    }
  ]
}
```

The executor finds the contact whose name + company matches,
runs the summarisation, and shows the result inline.

## Available tools

**Read tools** (run immediately, no confirmation):

- `summarize_contact` — pulls notes, recent activity, deals,
  and produces a one-paragraph briefing
- `draft_followup_email` — drafts (does NOT send) a follow-up
  email keyed to a specific angle
- `navigate_to` — takes the user to a specific dashboard page

**Write tools** (require confirmation click):

- `update_deal_stage` — moves a deal to a named stage in the
  same pipeline
- `add_contact_note` — appends a note to a contact's notes field
- `set_lead_status` — sets the lead status (`new`, `contacted`,
  `qualified`, `nurture`, `hot`, `under_contract`, `closed`,
  `lost`)
- `create_task` — creates an Activity of type "task" on a
  contact, optionally with a due date
- `schedule_followup` — creates a CalendarEvent
- `link_deal_to_contact` — sets `contactId` on a deal

Every write writes an audit row keyed to the actual entity id —
not the natural-language input — so the audit trail is precise.

## Confirmation UX

When the planner emits a write tool, the bar shows a preview:

> **Move "Vista House" deal from "Showing" → "Negotiation"?**
> Rationale: User asked to move the Vista deal forward.
> [Cancel] [Confirm]

Click Confirm to execute. Cancel discards the plan. The same
plan can't be re-confirmed; if you cancel and want to redo it,
type the request again.

## Clarifications

If the planner can't find a unique target (e.g. "summarize
Marco" but you have three Marcos), it returns an empty steps
array + a clarification question:

> **Which Marco do you mean? Marco Bianchi (Acme), Marco
> Schmidt (Globex), or Marco Rossi (Initech)?**

Reply with the disambiguator, the planner re-runs.

## Path safety

The `navigate_to` tool's path is regex-restricted to internal
CRM paths only. The schema rejects:

- `/api/*` (would expose JSON to a redirect)
- `//evil.example.com/...` (protocol-relative phishing)

The planner's system prompt is also instructed to use only
internal paths like `/contacts`, `/deals`, `/settings/pipelines`.

## What it costs

Claude Haiku per call. Reads typically 1 LLM round-trip
(~$0.001), writes 1 round-trip + the confirmation has no
additional LLM call. A heavy user (50 commands/day) is roughly
$1.50/month per user.

If `ANTHROPIC_API_KEY` is unset, the command bar shows a
"Command bar disabled — set ANTHROPIC_API_KEY" notice in dev
and is hidden in production.

## Rate limits

- 60 plans / hour / user (the planner call)
- 60 executes / hour / user (separate bucket)

The two buckets means a runaway script can't burn LLM budget
without also being throttled on execution.

## Audit trail

Every command bar action writes an audit log entry naming the
tool used and the resolved entity id. Filter `/audit` to
`actor: <you>` to see your command-bar history.

The natural-language input itself is **not** stored in audit
(it could contain sensitive info). The resolved tool call +
arguments are.

## Common questions

**Q: Can I add custom tools?**
A: Yes — `lib/philly/ai/command-planner.ts` defines the schema.
Add a new tool entry + handler, deploy. The planner picks it
up.

**Q: Why did the bar refuse to navigate to /api/something?**
A: That's the path-safety regex (see above). Use the bar for
UI navigation; for API access use the API directly.

**Q: Why is my write request asking me to clarify?**
A: The planner couldn't uniquely identify the target.
Disambiguate with a more specific name, email, or id.

## Where to go next

- **[AI contact attributes](features/ai-attributes)** — the
  *background* AI enrichment that runs on contact create.
- **[/assistant chat](onboarding/welcome)** — for "how do I X"
  questions, not commands.
- **[Audit log](features/audit)** — review your command-bar
  actions.
