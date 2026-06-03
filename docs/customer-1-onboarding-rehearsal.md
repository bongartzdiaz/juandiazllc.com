# Customer #1 onboarding rehearsal — runbook

**When to use:** before sending the customer-#1 invite link. Walk this
end-to-end on staging with a fresh test account; budget 30 minutes.
Catch the rough edges that tests don't see — copy that reads weirdly,
buttons that don't go where you expect, error states that confuse.

**What you need:**

- A fresh email address (not your operator account) with access to a
  Google Calendar OR Microsoft 365 calendar that has at least 2 real
  events in the next 7 days
- The staging URL with all env vars set per
  `_drafts/operator/env-vars-walkthrough.md`
- A Stripe test card: `4242 4242 4242 4242`, any future expiry, any
  CVC, any postal code
- About 30 minutes uninterrupted

**Outcome:** a written punch list of issues to fix before the real
customer. Most rehearsals surface 3-5 small things; if you find more
than 10, push customer-#1 by a day and ship the fixes first.

---

## Phase 0 — Preflight (5 min)

- [ ] `/status` page is green. If it shows degraded or down, fix the
      underlying issue first — don't onboard a customer onto a sick
      stack.
- [ ] Verify CRON entries in Vercel (or systemd / GitHub Actions on
      Hetzner): `/api/audit/prune`, `/api/calendar/cron/renew-channels`,
      `/api/calendar/cron/prune-channels` all configured with the
      `X-Cron-Secret` header.
- [ ] Hit `/health` from a browser — should return 200 with
      `database.ok=true`. Note the latency (will compare on prod).
- [ ] Confirm DEUS-SHARED is up to date with the operating branch (if
      Sync Bot ran successfully today).

---

## Phase 1 — Sign-up + onboarding wizard (5-7 min)

- [ ] Open the staging marketing site in a fresh incognito window.
      Pick a locale that ISN'T English (NL recommended — it's where
      customer #1 most likely lives). Verify the site renders Dutch
      from the first paint, not flashes English first.
- [ ] Click "Start free trial" or whichever CTA leads to sign-up.
      Sign up with the test email + a strong password.
- [ ] Verify the welcome email arrives within ~30 seconds (check spam
      folder too — if it's there, the SPF/DKIM setup needs review).
- [ ] Land in the dashboard. The onboarding wizard should fire on
      first login.
- [ ] **Industry step**: pick a sector. Verify the seeded pipeline
      template uses operator language ("survey / blueprint / build /
      operate / scale"), not generic sales-stage names.
- [ ] **Organization step**: enter a fake company name + KvK number.
      Time zone should default to `Europe/Amsterdam`.
- [ ] **Team step**: skip for now (we test invites in Phase 4).
- [ ] **Contacts step**: skip — we want to walk the CSV import
      separately in Phase 3.
- [ ] **Calendar step**: connect Google or Microsoft. Approve the
      OAuth scopes. Confirm you bounce back to DEUS with a green
      "Connected as foo@…" badge.
- [ ] Wizard finishes; you land on the dashboard.

**Watch for:**
- Did the wizard remember your industry choice?
- Did the calendar OAuth callback redirect you correctly (not to
  `/philly/login` — that's the bug we fixed in `9cd1acd`)?
- Did any English copy leak through if you picked NL/DE/ES?

---

## Phase 2 — Dashboard first-impression (3 min)

- [ ] **QuickStartCards** appears on the dashboard. Three cards
      visible: Connect calendar (should be ✓ already), Import contacts,
      Invite team.
- [ ] Calendar card shows the green "Done" check (you connected in
      Phase 1).
- [ ] **Floating "?" button** is visible bottom-right. Click it. Drawer
      slides in. Search for "calendar" — top result should be
      `connect-google-calendar`. Press Escape — drawer closes, focus
      returns to the "?" button (you should see the focus ring).
- [ ] Sidebar shows the **Help** entry.
- [ ] Click into Help. Verify the language-disclosure banner shows
      (since you're in NL). Email link works.

**Watch for:**
- Does the QuickStartCards section announce itself if you tab in
  with a screen reader (`aria-live="polite"`)?
- Mobile: open the same page on a phone or narrow window. The help
  center sidebar should collapse below the main column at <720px.

---

## Phase 3 — Contacts + CSV import (5 min)

- [ ] Prepare a small CSV: 5-10 rows, headers `email,first_name,last_name,company,phone`.
      Include yourself plus a few realistic prospects. Make sure ONE
      of those emails matches an attendee on a real calendar event in
      the next 7 days — that's how we test the meetings tab.
- [ ] Contacts → Import. Drag-drop the CSV. Auto-mapping should pick
      up all five headers as known fields.
- [ ] Click Import. Watch the progress bar. Should land in <5 seconds
      for 10 rows.
- [ ] Open a contact whose email you put on a real calendar event.
      Click the Meetings tab. Within ~10 seconds (push-sync delay),
      you should see at least one upcoming meeting.

**Watch for:**
- Is the meeting time-zone correct?
- Are non-CRM-contact attendees absent from the matched-emails list
  (privacy filter)?
- Does the "Open in provider" link (htmlLink) bounce you to Google /
  Outlook with the right event?

---

## Phase 4 — Team invites + seats (3 min)

- [ ] Settings → Team. Verify the seat counter reads `1/3` (you,
      out of free-tier limit).
- [ ] Send an invite to a second test email. Pick role: manager.
- [ ] Open the invite email in another browser/incognito. Click the
      link. Set a password. Land in the org as a manager.
- [ ] Back in the admin window: seat counter now reads `2/3`.
- [ ] QuickStartCards "Invite team" card now shows green ✓.

**Watch for:**
- Does the invite email arrive promptly?
- Does the manager role correctly hide admin-only routes (e.g.
  `/philly/settings/billing` should be admin-only)?

---

## Phase 5 — Billing + Stripe Customer Portal (3 min)

- [ ] Settings → Billing. Click "Start free trial → Professional".
- [ ] Complete Stripe Checkout with the test card.
- [ ] Land back on Settings → Billing with "Trial ends in 14 days"
      visible.
- [ ] Click "Manage subscription" → opens Stripe Customer Portal in
      a new tab.
- [ ] In the Portal, update the card to a different test number.
      Verify it succeeds.
- [ ] Back on DEUS billing page (refresh): subscription status still
      `trialing`, plan still `Professional`.

**Watch for:**
- The webhook should have fired (`customer.subscription.created`).
  Check `Subscription` row in the DB has the right `seatCount` and
  `currentPeriodEnd`.

---

## Phase 6 — Privacy + DSAR (3 min)

- [ ] Settings → Privacy. Click "Export my data" with scope = My
      data.
- [ ] Browser downloads a JSON file. Open it in a text editor.
      Verify:
      - `manifest.export_version` is `1.2.0`
      - `manifest.synced_calendar_event_count` matches the events
        you saw in Phase 3
      - No `accessTokenEnc` / `refreshTokenEnc` / `authSecretEnc` /
        `passwordHash` strings anywhere (sensitive-credential
        omission)
      - No `description` field on any synced event (Art. 9
        minimisation)
- [ ] Click "Delete my account" → cancel out (don't actually delete
      this account). Verify the typed-DELETE confirmation modal works.

---

## Phase 7 — Edge-case smoke (3 min)

- [ ] In a third incognito window, try signing up with the SAME email
      from Phase 1. Should fail gracefully — generic "an account with
      this email already exists" or equivalent (NOT a stack trace).
- [ ] Visit a route you don't have access to (e.g. `/philly/audit`
      with a manager session). Should 403/redirect, not show the
      page.
- [ ] Hit `/api/health` directly. Should return 200 + JSON.
- [ ] Hit `/philly/api/calendar/cron/renew-channels` without the
      `X-Cron-Secret` header. Should 401 (the route's own check),
      NOT 302 to /login (the middleware allowlist works).

---

## Phase 8 — Decision (2 min)

After completing all phases, write down:

1. **Found issues** (count + 1-line description each):
   - …
2. **Worst issue severity** (none / cosmetic / functional / blocking):
   - …
3. **Customer-#1 go/no-go**:
   - GO if zero blocking + ≤3 functional issues
   - NO-GO otherwise — push customer-#1 by 24-48h, ship the fixes
4. **Punch list for tomorrow** (ordered by priority):
   - …

Email the punch list to yourself. Tomorrow morning, work the list.

---

## Document control

| Item | Value |
|---|---|
| Last updated | 2026-05-08 |
| Owner | Juan |
| Time budget | 30 minutes |
| Trigger | day before customer-#1 first-touch email goes out |
| Re-run cadence | every 5 customers, OR after any infra change |
