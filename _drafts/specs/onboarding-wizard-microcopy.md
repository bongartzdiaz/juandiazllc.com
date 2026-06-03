---
title: Onboarding wizard — microcopy (EN)
status: draft
last_updated: 2026-05-06
---

# Onboarding wizard microcopy

EN-first. NL translation is a follow-up pass — strings that need care are flagged at the bottom.

The whole flow uses **one** exclamation (Step 6 hero). Everywhere else: periods.

---

## Step 1 — Welcome

| Key | Copy | Why |
|---|---|---|
| Hero title | `Welcome to DEUS, {firstName}` (28 + name chars) | Names beat generic "Hi there"; period because "!" is reserved for step 6 |
| Hero sub | `Five short steps to get your team and contacts in. Skip anything you want to do later.` (87 chars) | Sets time expectation + gives explicit permission to skip — kills the "I have to finish this all NOW" pressure |
| RE card title | `Real estate` | Plain noun, no marketing |
| RE card body | `Brokerage, property management, agent teams. Deals, properties, and showings.` | Lists who it's for + what they get; 3 named modules |
| Hospitality card title | `Hospitality` | Same |
| Hospitality card body | `Hotels, restaurants, venues. Reservations, rooms, and quotes.` | Same shape as RE so the choice feels parallel |
| Step indicator | `Step 1 of 5` | Concrete number + total; users know how much is left |

## Step 2 — Org details

| Key | Copy | Why |
|---|---|---|
| Heading | `About your organization` | Subject-first, scannable |
| Sub | `We need a few basics to set up dates, deals, and reports correctly.` | Tells them WHY — not just "fill these in" |
| Field: company name label | `Company name` | — |
| Field: time zone label | `Time zone` | — |
| Time zone helper | `We auto-detect from your browser. Change if needed.` (51 chars) | Reassures the default is sensible + offers control |
| Field: default currency label | `Default currency` | — |
| Currency helper | `Used for deal values and reports. You can override per deal.` (60 chars) | Explains scope of the default — kills "is this final?" anxiety |
| Primary button | `Save and continue` (17 chars) | Verb-first, two outcomes in one phrase |
| Validation: empty company name | `Enter your company name.` | Active, instructive — tells them what to do |
| Validation: invalid time zone | `Pick a time zone.` | Same |

## Step 3 — Team invites

| Key | Copy | Why |
|---|---|---|
| Heading | `Invite your team` | Verb-first, action-oriented |
| Sub | `Your plan starts with 3 seats. Add up to 5 invites here, or skip and do it later.` | Anchors the seat number + caps the row count + permits skipping |
| Email label | `Email` | — |
| Role label | `Role` | — |
| Role tooltip: admin | `Full access, including billing and team management.` (52 chars) | One distinguishing phrase per role |
| Role tooltip: manager | `Full access except billing.` (27 chars) | — |
| Role tooltip: viewer | `Read-only access to contacts, deals, and reports.` (50 chars) | — |
| Primary button (≥1 row valid) | `Send invites` (12 chars) | Imperative |
| Primary button (0 rows) | (hidden) | Don't show a disabled CTA — show only "Skip" |
| Secondary skip | `Skip — I'll invite later` (24 chars) | Em-dash is fine in product copy |
| Email placeholder | `teammate@example.com` | Generic, signals the format |
| Inline success | `Sent to {email}` | "Invite" is implied by context |
| Inline error: dup | `Already in your team` | Soft, not "rejected" |
| Seat counter | `{used} of {limit} seats used` | Lowercase "seats" per brand rules |
| Counter helper | `Counts you, your teammates, and pending invites.` (49 chars) | Explains the math — no surprise when the counter ticks before they accept |

## Step 4 — Contacts

| Key | Copy | Why |
|---|---|---|
| Heading | `Add your contacts` | — |
| Sub | `Bring in your existing contacts so deals connect to real people from day one.` | "Day one" anchors the value moment |
| Card A title | `Upload a CSV` | — |
| Card A body | `We auto-map name, email, phone, and company. Preview before saving.` (66 chars) | Specifies fields + reassures with "preview before saving" |
| Card B title | `Add them manually` | — |
| Card B body | `Open a blank contact form and add them one by one as you go.` (60 chars) | Honest about the trade-off |
| Skip | `Skip — I'll add contacts later` | Same shape as step 3 skip |
| Tip | `Up to 10,000 rows per file.` | Concrete cap, no friction |

## Step 5 — Calendar

| Key | Copy | Why |
|---|---|---|
| Heading | `Connect your calendar` | Verb-first |
| Sub | `Meetings sync both ways, and time spent on a deal is tracked automatically.` | Two specific benefits, not a generic "stay productive" line |
| Google button | `Connect Google Calendar` | Specific provider name |
| Outlook button | `Connect Outlook` | Same |
| Why-connect bullets | `Meetings on a deal show up in DEUS without copy-paste.` / `Time tracked per deal answers "where is this hour going?" on the dashboard.` / `Reminders for follow-up calls appear next to the contact.` | Each bullet says what they avoid OR what they gain — concrete |
| Skip | `Skip — I'll connect later` | Consistent skip phrasing |
| Popup-blocked | `Your browser blocked the popup. Allow popups for app.lucen.ai and try again.` | Names the domain so they know what to whitelist |
| Retry | `Try again` (9 chars) | — |

## Step 6 — Done

| Key | Copy | Why |
|---|---|---|
| Hero title | `You're set up!` | The ONE exclamation — earns it after a 5-step lift |
| Hero sub | `Three quick things you can do now from the dashboard.` | Frames the next-step cards |
| Card 1 title | `Run an AI insight` | — |
| Card 1 body | `Pick any deal and ask DEUS for next steps. Runs locally on our server.` (68 chars) | Names the action + flags the EU-residency-quietly ("locally on our server") |
| Card 2 title | `Read the 5-page walkthrough` | — |
| Card 2 body | `A short tour of every screen you'll use this week.` (49 chars) | Anchored to "this week" so it's not a marathon read |
| Card 3 title | `Tour the audit log` | — |
| Card 3 body | `Every change in DEUS is recorded. See who did what, when.` (56 chars) | Sells trust — every action is visible |
| Primary CTA | `Go to dashboard` (15 chars) | — |
| Toast | `Setup complete — welcome to DEUS` | Em-dash separates state from greeting |

## Resume banner on `/philly`

Shown when the org has `onboardingStep != 'done'` and `onboardingSkippedAt` is null OR was set >24h ago.

| Key | Copy | Why |
|---|---|---|
| Banner title | `Finish your DEUS setup` (22 chars) | Direct verb, anchors what's incomplete |
| Banner body | `You're {N} steps in. Resume to invite your team and import contacts.` | Pulls progress + previews the value of resuming |
| Primary | `Resume setup` (12 chars) | — |
| Dismiss | `Hide for today` (14 chars) | "For today" — softens the dismissal, comes back tomorrow |

## Empty state for manager / viewer hitting `/philly/onboarding`

| Key | Copy | Why |
|---|---|---|
| Heading | `Your admin handles setup` | Doesn't blame them, just states reality |
| Body | `Only the organization admin runs the setup wizard. Once they finish, you'll have full access to contacts, deals, and the rest of DEUS.` | Two sentences, sets expectation |
| Primary CTA | `Back to dashboard` | — |

## System toast / flash

| Key | Copy | Why |
|---|---|---|
| Save success | `Saved` | One word — frequent, low-importance |
| Skip confirm | `Skipped — you can finish later` | Reassures the choice isn't permanent |
| Step completed | `Step saved` | Distinct from `Saved` so the user knows progress moved |

---

## NL-translation flags (for the follow-up locale pass)

These EN strings have NL versions that need a thoughtful rewrite, not a literal translation:

- `Run an AI insight` → literal "Draai een AI-inzicht" reads awkward. Prefer **`Vraag AI om inzicht`**.
- `You're set up!` → second-person tu/u choice. Customer #1 is NL — go with **`Je bent klaar!`** (informal, matches DEUS tone).
- `seat` (subscription) → keep as **`seat`** loan-word in NL UI; "plek" sounds physical, not subscription.
- `Skip — I'll add contacts later` → NL: **`Sla over — contacten kan ik later toevoegen`** (verb position shift).
- `Day one` (in step 4 sub) → NL doesn't have a clean idiom. Use **`vanaf de eerste dag`**.
- `where is this hour going?` (step 5 bullet) → keep as direct quote in NL: **`waar gaat dit uur naartoe?`**

## Self-audit (3 things that could be sharper)

1. **Step 5 sub** — "tracked automatically" hides whether the user has to do anything. A future revision could say "tracked when meetings sync" to be more explicit about the mechanism.
2. **Resume banner body** — `{N} steps in` requires the integer to be stable as users skip steps. If the number jumps from "2 steps in" → "skip-skip-skip → 5 steps in", it'll feel arbitrary. Consider replacing with `Two minutes from done.` once we know the average completion time.
3. **Step 6 card 1 body** — "Runs locally on our server" is a bit operationally specific for a celebratory screen. Could be cut to `Pick any deal and ask DEUS for next steps.` and the EU-residency story moves to the privacy page.
