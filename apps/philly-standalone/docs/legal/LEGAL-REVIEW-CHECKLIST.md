# Legal review checklist

Hand this folder to outside counsel before any EU customer
go-live. The seven docs are drafted as code-as-policy templates;
the lawyer's job is to (a) replace placeholder fields, (b)
ratify or revise the policy text against the operator's actual
practices, and (c) sign off in writing.

## Placeholder convention

Every operator-supplied field in these documents is wrapped in
the marker `[TO FILL: description]`. To find every spot that
still needs input:

```bash
grep -rn "\[TO FILL:" apps/philly-standalone/docs/legal/
```

Every match is one line for the lawyer (or operator) to
substitute with a concrete value before sharing externally.

## Doc-by-doc review notes

### `DPA.md` — Data Processing Agreement (GDPR Art. 28)

**Required fields:** Controller legal entity + address, Processor
legal entity + address, nature of processing, categories of data,
data-subject categories, sub-processor list with country + safeguard.

**Reviewer focus:**
- Confirm Schedule 1 (Processing details) matches the actual
  `lib/gdpr/ropa.ts` register (use `npm run docs:check-ropa`).
- Confirm Schedule 2 (Security measures) is consistent with the
  technical measures actually implemented (encryption-at-rest,
  audit-chain, blind-index — all documented under
  `docs/operations/PII-ENCRYPTION.md`).
- The sub-processor list in Schedule 3 must match
  `SUB-PROCESSORS.md` exactly.

### `PRIVACY-NOTICE.md` — Public-facing privacy notice (Art. 13/14)

**Required fields:** Controller legal entity + address, contact
e-mail, DPO name + e-mail (if appointed), date.

**Reviewer focus:**
- Lawful basis section must mirror the `lawfulBasis` field on every
  processing activity in the RoPA.
- Retention table should match `lib/gdpr/pii-registry.ts` retention
  defaults (currently 365 × 3 days for Contact, 365 × 2 for Activity).
- Cross-border transfer language references SCCs — confirm SCCs
  are in place with every sub-processor in the Sub-Processors doc.
- AI Article 50 transparency disclosure for the contact-attributes
  feature is in `DPIA-AI-ATTRIBUTES.md`; the privacy notice should
  cross-reference it.

### `RECORDS-OF-PROCESSING.md` — Art. 30 RoPA export

**Required fields:** Controller legal entity + address, contact
e-mail, DPO name + e-mail (if appointed), date.

**Reviewer focus:**
- This file is auto-generated from `lib/gdpr/ropa.ts` and should
  not be hand-edited beyond the header. If activities have changed,
  re-run `npm run docs:export-ropa` (operator script) and review
  the diff.

### `SUB-PROCESSORS.md` — Art. 28 §2 sub-processor register

**Required fields:** Date, notice channel.

**Reviewer focus:**
- Confirm every entry has a current DPA on file and an active SCC
  (or adequacy decision) where the processor stores data outside
  the EEA.
- Vendor changes require 30 days' written notice to controllers
  per Art. 28 §2 — operators must subscribe via the listed notice
  channel.

### `DPIA-AI-ATTRIBUTES.md` — DPIA per Art. 35 + AI Act Art. 27

**Required fields:** Owner name + role, DPO consulted (yes/no +
date), first version date, last reviewed date.

**Reviewer focus:**
- Eight risks each have a mitigation. Confirm each mitigation is
  technically in place (cross-reference the Bundle N/P/U
  encryption work and the audit-chain integrity job).
- AI Act Art. 50 transparency banner is rendered on the
  ContactQuickView (file: `components/philly/contacts/ContactQuickView.tsx`,
  Bundle T+L) and on `AiAttributesCard.tsx` (Bundle L).

### `BREACH-RESPONSE.md` — Art. 33/34 breach response runbook

**Required fields:** Incident commander, privacy on-call (DPO),
communications lead, outside counsel — name + e-mail for each,
in primary + backup columns.

**Reviewer focus:**
- 72-hour notification clock (Art. 33 §1) — confirm the
  notification template at the bottom of the doc is acceptable.
- DPA's Autoriteit Persoonsgegevens contact link is correct;
  add equivalent links for any other supervisory authority your
  operator targets (BfDI for Germany, AEPD for Spain, etc.).

### `COOKIE-POLICY.md` — Cookie + tracker disclosure

**Required fields:** Privacy contact e-mail.

**Reviewer focus:**
- Cookieless-analytics stance confirmed by Bundle 2 (Plausible
  loaded unconditionally, no consent banner). The doc text
  reflects this. If the operator adds consent-required trackers
  later, this doc must be revised in parallel.

## Sign-off

The lawyer's review concludes with a signed memo confirming:
- Every `[TO FILL: ...]` marker has been resolved
- The seven docs are accurate as of the review date
- The next mandatory review date is recorded in
  `RECORDS-OF-PROCESSING.md` header

After sign-off, commit the resolved docs to the repository so
the policy version is the same one customers see.
