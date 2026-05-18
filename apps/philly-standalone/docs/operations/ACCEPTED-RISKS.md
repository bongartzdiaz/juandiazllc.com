# Accepted risks — deliberate gaps at launch

This file documents items in `GO-LIVE-CHECKLIST.md` that were
deliberately deferred at first launch, with the trigger that retires
each one. It exists so a counsel reviewing 30 days post-launch sees
the deliberate decision instead of a forgotten gap, and so future-you
remembers what's owed.

> **Update procedure:** when you close an accepted risk, move the row
> from the "Open" table to the "Closed" log at the bottom with the
> date + commit SHA + evidence link.

---

## Open accepted risks

> Fill this in during your launch walkthrough. Each row should answer:
> what was skipped, why it was safe to skip, what triggers revisiting,
> who owns the revisit. Template rows below — replace `[…]` with real
> values when you commit a launch event.

| Date | Risk | Why deferred | Revisit trigger | Owner | Status |
|---|---|---|---|---|---|
| `[YYYY-MM-DD]` | Counsel sign-off on `docs/legal/*.md` [TO FILL] markers | Solo operator pre-customer-#1; counsel round-trip 1-2 weeks would block launch indefinitely; first-pass fill landed with self-acknowledged risk | Within 30 days of customer #1 | Juan | OPEN |
| `[YYYY-MM-DD]` | DPO countersign on RoPA + DPIA | Processing scale below threshold (<1000 contacts) where retained DPO is GDPR-required; substituting documented absence + monitoring scale | At customer #10 OR within 60 days, whichever first | Juan | OPEN |
| `[YYYY-MM-DD]` | Formal backup-restore drill captured | Manual snapshot taken pre-launch (Supabase snapshot ID `[backup-id]`); formal drill defers until data volume justifies | At customer #5 | Juan | OPEN |

---

## Closed risks (log)

> Append rows as you close them. Keeping closed entries here (rather
> than deleting them) gives future you / counsel a paper trail.

| Date | Risk | Closed by | Evidence |
|---|---|---|---|
| | | | |

---

## Why this file exists

Two reasons:

1. **Counsel review delta.** Lawyers / compliance auditors evaluating
   your launch in retrospect will ask "why did you launch without X?"
   "We forgot" is a bad answer. "We made a deliberate risk-accepted
   decision documented at <git-sha> with revisit trigger <Y>" is a
   defensible answer.
2. **Future-you.** In 6 weeks you will not remember which corners you
   cut. This file is the answer to "wait, did I deal with the DPO
   thing yet?".

Cross-reference: `GO-LIVE-CHECKLIST.md` is the universe of items;
`LAUNCH-WALKTHROUGH.md` is the path through them; this file is the
list of "OK to skip with paperwork" exits from that path.
