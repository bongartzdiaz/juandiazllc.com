# Email Deliverability Checklist — hello@lucen.ai

Operator pre-launch checklist for transactional email through Resend.
Customer-#1 welcome mail (Mon 18 May 21:00 CET) **must not land in
spam**. This document is the playbook to ensure that.

**Target:** mail-tester.com score ≥9/10 before Sat 17 May.
**Owner:** Juan.
**Time budget:** 60-90 min total (most is DNS-propagation wait).

---

## Section 1 — DNS records (one-time setup)

DNS access required at your registrar (Cloudflare / TransIP / wherever
`lucen.ai` is registered). All records go on the apex `lucen.ai`
unless noted.

### 1.1 SPF

```
Type:   TXT
Host:   @ (or lucen.ai)
Value:  v=spf1 include:_spf.resend.com ~all
TTL:    3600
```

**Why `~all` not `-all`**: soft-fail allows borderline-rejected mail
to be marked spam instead of bounced. After 30 days of clean
sending, tighten to `-all`.

**Conflict check**: if you already have an SPF record (e.g. from
Google Workspace), merge the includes:
```
v=spf1 include:_spf.google.com include:_spf.resend.com ~all
```
You can only have **one** SPF record. Two = both invalidate.

### 1.2 DKIM

Resend issues 2 DKIM CNAME records when you verify the domain in
their dashboard (Settings → Domains → Add Domain → lucen.ai).

```
Type:   CNAME
Host:   resend._domainkey.lucen.ai
Value:  resend._domainkey.<random>.dkim.resend.com
TTL:    3600
```

```
Type:   CNAME
Host:   resend2._domainkey.lucen.ai
Value:  resend2._domainkey.<random>.dkim.resend.com
TTL:    3600
```

Exact values come from Resend dashboard — copy verbatim. Wait
~30 min for propagation, then click "Verify" in Resend. Status
must be green before continuing.

### 1.3 DMARC

```
Type:   TXT
Host:   _dmarc.lucen.ai
Value:  v=DMARC1; p=quarantine; rua=mailto:postmaster@lucen.ai; pct=100; aspf=r; adkim=r
TTL:    3600
```

**Policy `p=quarantine`**: failing mail goes to spam (not bounced).
For first-month launch this is right — too strict (`reject`) risks
losing legit mail to false positives.

**`rua` reporting**: aggregate reports come to
`postmaster@lucen.ai`. Set up that mailbox first (Resend or
Gmail-forward). Reports arrive daily, mostly noise — scan for
patterns weekly.

After 30 days clean: tighten to `p=reject; pct=100`.

### 1.4 MX (for receiving)

If `lucen.ai` is sending-only and you don't need to receive there,
skip. If you want replies to `hello@lucen.ai` to land somewhere:

```
Type:   MX
Host:   @
Priority: 10
Value:  mxa-resend.com (or your preferred receiver)
```

---

## Section 2 — Resend configuration

In Resend dashboard:

- [ ] Domain `lucen.ai` added + verified (green check)
- [ ] Sender identity: `hello@lucen.ai` configured with display name
      "Juan @ DEUS" (not "DEUS Team" — personal name boosts open-rate)
- [ ] **Webhook endpoint configured** for bounce/complaint tracking
      (POST to `/api/email/webhook` or similar — see DEUS-SHARED if
      it has one wired up)
- [ ] Sandbox mode OFF (production)
- [ ] Suppression list reviewed — no test-addresses lurking
- [ ] API key in `.env` set with proper RESEND_API_KEY (not test key)

---

## Section 3 — Test procedure (before customer-#1 send)

### 3.1 mail-tester.com

1. Go to https://www.mail-tester.com
2. Copy the generated test-address (looks like `test-abc123@srv1.mail-tester.com`)
3. Send a copy of welcome-email-mail-a.md content via Resend to that address
4. Wait 60 seconds, click "Then check your score"
5. **Score must be ≥9/10**. Below = fix and retry.

Common deductions and fixes:

| Deduction | Fix |
|---|---|
| Missing/broken SPF | Section 1.1 — verify TXT record reaches DNS |
| DKIM not aligned | Section 1.2 — both CNAMEs must resolve |
| No DMARC | Section 1.3 — add TXT record |
| HTML/text-only mismatch | Send both `html` and `text` field in Resend payload |
| Unsubscribe-link absent | Add `List-Unsubscribe` header (Resend does this automatically if configured) |
| Suspicious phrases | See spam-trigger list below |
| New domain reputation | See warm-up section |

### 3.2 MXToolbox

For each: green = pass.

- https://mxtoolbox.com/SuperTool.aspx?action=spf%3alucen.ai
- https://mxtoolbox.com/SuperTool.aspx?action=dkim%3alucen.ai%3aresend
- https://mxtoolbox.com/SuperTool.aspx?action=dmarc%3alucen.ai

### 3.3 Real-inbox tests

Send a copy of the welcome mail to **3 different inbox-types**:

- [ ] Gmail personal address
- [ ] Outlook.com personal address
- [ ] Corporate Microsoft 365 address (your own Kompas mailbox?)

For each: arrives in **Inbox**, not Spam/Junk/Promo? If any goes to
spam, **do not send to customer #1 yet**.

---

## Section 4 — Spam-trigger phrases to avoid

Check welcome-email-mail-a.md for any of these. Replace if present.

| Avoid | Use instead |
|---|---|
| "100% free" | "free trial" or skip |
| "Click here" | descriptive link text |
| "Guaranteed" | specific commitment ("we'll respond in 4 hours") |
| "Limited time offer" | "this week" or specific date |
| "Act now" | "see you Tuesday" |
| Multiple exclamation marks!!! | one or none |
| ALL CAPS lines | normal capitalization |
| `<font>` color="red" inline | CSS via inline styles minimally |
| "Hi friend" / "Dear customer" | use their first name |

Mail-tester also catches these — if score <9, the report tells you
which phrases tripped it.

---

## Section 5 — Sender reputation warm-up

**New domains have zero reputation** with major mail providers. Cold
sending = higher spam-rate. Warm up before customer-#1.

### Warm-up plan (Sat 9 May → Sun 17 May, 9 days)

| Day | Action | Volume |
|---|---|---|
| Sat 9 May | Set up DNS (sections 1.1-1.3) | 0 |
| Sun 10 May | Wait DNS propagation, run MXToolbox | 0 |
| Mon 11 May | Send 1 test mail to Gmail address, then reply to it | 2 |
| Tue 12 May | Send to Outlook + corporate test addresses, replies | 4 |
| Wed 13 May | Send onboarding-rehearsal mail to operator alias | 1 |
| Thu 14 May | Send 1 marketing-style update to Hash + 1 friend | 2 |
| Fri 15 May | mail-tester.com test, target ≥9 | 1 |
| Sat 16 May | If score <9: fix + retest. If ≥9: hold. | 0-2 |
| Sun 17 May | Final mail-tester.com confirm | 1 |
| Mon 18 May 21:00 | Customer-#1 welcome | 1 |

**Total warm-up**: ~12 mails over 9 days. Looks normal to providers.
Stops the "brand new domain blasting transactional mail" red flag.

### What NOT to warm up with

- Marketing mass-mail (won't help, may hurt reputation)
- Bulk newsletter (different reputation lane than transactional)
- Same-content repeats (looks like spam)

---

## Section 6 — Mail-tester fail recovery

If on Fri 15 May the score is <9, debug systematically:

1. **Score 0-5 (broken)**: SPF or DKIM not aligning. Re-check
   section 1.1 and 1.2. Most likely: DNS TXT-record syntax error,
   or Resend domain not verified. Wait 30 min after DNS edit,
   re-test.

2. **Score 5-7 (config issues)**: DMARC missing or pointed at
   non-existent mailbox. Re-check section 1.3.

3. **Score 7-8.5 (content issues)**: spam-trigger phrases or
   missing HTML/text body alternative. Re-check section 4 + verify
   Resend payload includes both `html` and `text`.

4. **Score 8.5-8.9 (close but not 9)**: usually missing
   List-Unsubscribe header or sender-name not configured. Resend
   Settings → Domains → Identity, set "Juan @ DEUS".

5. **Score 9-10 (ready)**: ship.

---

## Section 7 — Post-launch monitoring

After Mon 18 May 21:00 send, monitor for 24 hours:

- [ ] **23:00 Mon**: customer replied (good signal) or no-reply (check
      Resend logs at 23:30 — was mail delivered? bounced? opened?)
- [ ] **08:30 Tue**: check `postmaster@lucen.ai` for any DMARC
      reports (should be one or two, all aligned)
- [ ] **09:00 Tue**: check Resend dashboard for bounce/complaint
      status on customer's address — should be 0
- [ ] **Daily for first week**: scan postmaster@ for DMARC failures.
      Pattern of failures = real issue, not a one-off

If customer reports "didn't see your mail" or it goes to spam:
1. Check Resend logs for delivery status
2. Ask customer to check spam folder + whitelist `hello@lucen.ai`
3. If consistently lands in spam at their org: their IT needs to
   whitelist your sending IP (Resend can provide)

---

## Pre-launch checklist (Sat 17 May, 30-min final check)

- [ ] SPF record returns correct value on `dig TXT lucen.ai`
- [ ] DKIM both CNAMEs resolve on `dig CNAME resend._domainkey.lucen.ai`
      and `resend2._domainkey.lucen.ai`
- [ ] DMARC record returns on `dig TXT _dmarc.lucen.ai`
- [ ] Resend dashboard shows all 3 (SPF/DKIM/DMARC) green
- [ ] mail-tester.com score ≥9/10
- [ ] Welcome mail tested to Gmail/Outlook/Corporate, all in inbox
- [ ] Welcome mail subject ≤50 chars (current draft: 47 chars ✓)
- [ ] Welcome mail body has both HTML and plain-text variants
- [ ] List-Unsubscribe header present (Resend default)
- [ ] postmaster@lucen.ai mailbox configured for DMARC reports
- [ ] Hash informed: "deliverability green, sending Mon 21:00"

Once all 11 are checked, you're cleared to send Mon 18 May 21:00.

---

## Why this matters

Customer #1 reading your mail at 21:01 vs at 09:15 Tue (because spam
folder) is the difference between:

- **Spam path**: customer sleeps with no info, anxious morning,
  bad first impression → "amateurish setup"
- **Inbox path**: customer reads at leisure Mon evening, calm
  morning, good first impression → "competent setup"

90 minutes of DNS + tests = the difference. Cheap insurance.

---

## After 30 days (post customer-#1)

Once you have 30+ days of clean sending:

1. **Tighten DMARC**: change `p=quarantine` → `p=reject`. Stops
   spoof attempts entirely.
2. **Tighten SPF**: change `~all` → `-all`. Hard-fails impostors.
3. **Review DMARC reports**: pattern of failures = legitimate
   third-party sending mail under your domain (probably none).
4. **Domain reputation tools**: check
   https://senderscore.org/lookup.php — should be 90+ by month 2.
