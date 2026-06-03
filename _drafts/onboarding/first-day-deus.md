---
title: Your first day in DEUS
audience: New Customer admin or Authorized User
target_path: public/onboarding/first-day-deus.md
---

# Your first day in DEUS

Five short pages. Read alongside the app.

---

## Page 1 — Sign in

Open **app.lucen.ai** and click **Sign in**. Use the email address that received the welcome email.

Forgot your password? **Forgot password** sends a reset link. Links expire in 1 hour.

You stay logged in for 14 days unless you sign out. The session cookie is HttpOnly and Secure — nothing about your login lives in browser-readable storage.

---

## Page 2 — Invite your team

Go to **Settings → Team**.

1. Click **Invite member**.
2. Enter their work email.
3. Pick a role:
   - **Admin** — full access, including billing and team management.
   - **Manager** — full access except billing.
   - **Viewer** — read-only.
4. Send.

Each invite uses one **seat** from your plan. You see your seat count and what's used at the top of the Team page. Need more seats? **Settings → Billing** lets you upgrade in one click.

Invitees get an email with a sign-up link. Links expire after 7 days.

---

## Page 3 — Import your contacts

Go to **Contacts → Import**.

Upload a CSV. We auto-detect these columns: name, email, phone, company, role, notes, tags. Anything we don't recognize, you map manually in step 2.

Tips:

- Headers in the first row, please.
- UTF-8 encoded. Excel default works.
- Up to 10,000 rows per file. Bigger? Split or contact support.

Duplicates are detected by email. We show a preview before importing. You can roll back the last import for 24 hours under **Contacts → Imports**.

---

## Page 4 — First deal and AI insight

Go to **Deals → New deal**. Pick a contact, set a value, pick a stage (Lead → Qualified → Proposal → Won/Lost — rename these in **Settings → Pipelines**).

In the deal sidebar, click **AI insight**. DEUS reads the deal context and the contact's history and suggests next steps.

The AI runs on our own servers in Germany. Your data is **not** sent to OpenAI, Anthropic, or any other third party.

You can run an insight as often as you like — there is no per-call charge. Each run takes 5–15 seconds.

---

## Page 5 — Audit log, export, cancel

Three things to know about your data:

**Audit log** — Every change to a contact, deal, or setting is logged. Find it at **Settings → Audit log**. Filter by user, entity, and date.

**Export your data** — Anytime. **Settings → Privacy → Export my data** downloads a JSON archive of everything in your organization. Use it for backups, migration, or DSAR responses.

**Delete your account** — **Settings → Privacy → Delete my account**. Your data is soft-deleted for 30 days (in case you change your mind), then hard-purged. Backups roll off within 60 days.

To cancel the subscription itself: **Settings → Billing → Cancel subscription**. 30 days' notice. You keep access until the end of the current billing period.

---

That is the tour. Press **?** anywhere in DEUS for keyboard shortcuts.

If you get stuck: **support@lucen.ai** or **+31 [Juan's number]**.
