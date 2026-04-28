# Records of Processing Activities (RoPA)

_Required by Article 30 of the EU General Data Protection Regulation
(2016/679). This file is the human-readable export of the canonical
register kept in code at [`lib/gdpr/ropa.ts`](../../lib/gdpr/ropa.ts).
The code is the source of truth; this file is regenerated when
`PROCESSING_ACTIVITIES` changes._

| Field | Value |
| ---- | ---- |
| **Controller** | _\<LEGAL ENTITY NAME\>_, _\<ADDRESS\>_ |
| **Contact** | _\<privacy@example.com\>_ |
| **Data Protection Officer** _(if appointed)_ | _\<NAME / EMAIL\>_ |
| **Last updated** | _\<DATE\>_ |
| **Format** | Article 30 §1(a)–(g) per activity |

The platform is **multi-tenant** — each customer organisation is its
own controller for the data they collect; we (the platform operator)
act as **processor** for that data under a Data Processing Agreement
(see [`DPA.md`](./DPA.md)). The activities below describe processing
the platform performs as **processor** on behalf of every controller.

> **How to use this register.** Any new processing activity (new
> integration, new background job, new analytics, new AI feature)
> MUST be reflected as an entry in `lib/gdpr/ropa.ts` *in the same
> pull request* that introduces the processing. Code review enforces
> this — the entry is the regulator-facing description of what the
> code now does.

---

## Activities

### 1. CRM operator authentication
- **Purpose.** Authenticate employees of the customer organisation
  into the CRM. Email + password (hashed via Supabase Auth) plus
  optional TOTP 2FA. Mandatory 2FA for any user with role `admin`.
- **Data subjects.** Employees of the controller.
- **Categories of data.** Email, display name, hashed password, TOTP
  secret (encrypted at rest with `lib/philly/crypto.ts`), IP address
  of last successful login, last-login timestamp.
- **Lawful basis.** Contract — Art. 6(1)(b).
- **Recipients.** Supabase, Inc. (auth sub-processor) — see
  [`SUB-PROCESSORS.md`](./SUB-PROCESSORS.md).
- **International transfers.** EU SCCs in place with Supabase. Login
  IPs are stored in the EU primary region.
- **Retention.** While the user account exists; auto-purged 30 days
  after a self-service deletion request (`User.deletionScheduledAt`).
- **Security measures.** Password hashing by Supabase Auth, TOTP
  secrets encrypted, rate-limit on `/api/auth/login`, `withSpan`
  observability with SLO budget 1,200 ms.

### 2. Business-relationship management
- **Purpose.** Hold business contact data so operators can run their
  pipeline — leads, donors, tenants, counterparties.
- **Data subjects.** Business contacts of the controller.
- **Categories of data.** Name, email, phone, company, role/title,
  contact type, free-text notes, lead source, attribution UTM.
- **Lawful basis.** Legitimate interest — Art. 6(1)(f) — balanced
  against the contact's reasonable expectation of being contacted in
  a B2B context. Contacts can object via the controller's privacy
  contact; the platform supports controller-led erasure via
  `/api/admin/gdpr/erase`.
- **Recipients.** Supabase (database). Anthropic (only if AI
  enrichment is invoked — see activity 9).
- **International transfers.** EU primary region; SCCs for any
  Anthropic call. No transfers to other third countries by default.
- **Retention.** Configurable per controller; default 7 years from
  last update (industry-standard B2B retention), implemented in
  `lib/gdpr/pii-registry.ts`.
- **Security measures.** Tenant-isolated by `organizationId` on every
  query (audited by `npm run audit:tenant`); RBAC scoped via
  `requireRole`/`requireSection`; field-level encryption available
  for `email`/`phone`/`notes` (Bundle N).

### 3. Hospitality bookings
- **Purpose.** Manage room reservations and guest folios.
- **Data subjects.** Hotel guests of the controller.
- **Categories.** Guest name, email, phone, check-in/out dates,
  payment method (last 4 only — full PAN never stored), folio.
- **Lawful basis.** Contract — Art. 6(1)(b).
- **Retention.** 7 years (EU tax retention).

### 4. Volunteer programme administration
- **Purpose.** Roster, scheduling, hour logs for volunteers in
  philanthropic deployments.
- **Categories.** Name, contact details, availability, hour log,
  optional emergency contact.
- **Lawful basis.** Consent — Art. 6(1)(a) — captured at signup.
- **Retention.** While volunteer is active; 1 year after last shift.

### 5. Open-house visitor capture
- **Categories.** Name, email, phone, visit timestamp.
- **Lawful basis.** Consent — captured on the visitor sign-in form.
- **Retention.** 30 days unless the visitor is converted to a Contact.

### 6. Email & SMS correspondence
- **Purpose.** Allow operators to send/receive email (Gmail/Outlook
  OAuth) and SMS (Twilio) from inside the CRM.
- **Categories.** Message bodies, recipient/sender addresses,
  delivery status, threading metadata.
- **Lawful basis.** Legitimate interest — Art. 6(1)(f) — for B2B
  correspondence; Contract for transactional notifications.
- **Recipients.** Twilio (SMS), Google or Microsoft (email — only the
  customer's own mailbox via OAuth).
- **Retention.** 1 year then auto-purged.

### 7. Electronic signatures on contracts
- **Purpose.** Capture signed PDFs against transactions.
- **Lawful basis.** Contract — Art. 6(1)(b).
- **Retention.** 10 years (commercial-contract evidentiary minimum).

### 8. Security & compliance audit log
- **Purpose.** Forensic record of every state-changing operation.
- **Categories.** `userId`, `organizationId`, `action`, `entity`,
  `entityId`, JSON of changed fields, timestamp, hash, prevHash.
- **Lawful basis.** Legal obligation — Art. 6(1)(c) — required to
  demonstrate Art. 32 security and to respond to Art. 33 breach
  notifications.
- **Retention.** Indefinite for the hash chain itself; row payloads
  follow the underlying entity's retention policy after 1 year.
- **Security measures.** SHA-256 hash chain (`lib/philly/audit-chain.ts`)
  + integrity verifier (`npm run audit:chain`); append-only by API
  contract; no DELETE handler exposed.

### 9. AI-assisted contact enrichment
- **Purpose.** Use Claude Haiku to infer industry, ICP-fit score, and
  a narrative summary from contact data the controller has already
  collected. Decision-support only — never auto-routes leads or
  auto-rejects contacts.
- **Lawful basis.** Legitimate interest — Art. 6(1)(f) — balanced
  against the GDPR Recital 71 prohibition on solely-automated
  decision-making. Mitigation: a human (the operator) is always in
  the loop before any contact is contacted or rejected.
- **Recipients.** Anthropic, PBC.
- **International transfers.** United States, under EU SCCs + DPA.
  Anthropic's API is configured for zero retention of prompt and
  completion content.
- **DPIA.** Required by Art. 35 — see [`DPIA-AI-ATTRIBUTES.md`](./DPIA-AI-ATTRIBUTES.md).
- **Transparency.** EU AI Act Art. 50 — every inferred field is
  rendered behind an "AI generated" badge in the UI; users can opt
  out by deleting the row or skipping the regenerate button.
- **Retention.** Inherits the underlying contact's lifecycle.

### 10. Proof-of-erasure register
- **Purpose.** Demonstrate Art. 17 compliance to regulators without
  retaining the data subject's identifying information.
- **Categories.** SHA-256 hash of the email, erasure channel,
  per-model row counts.
- **Lawful basis.** Legal obligation — Art. 6(1)(c).
- **Retention.** Indefinite — the hash is pseudonymous and the proof
  must outlive any regulator inquiry.

---

## Where this register lives

- **Code (canonical):** `lib/gdpr/ropa.ts` — typed, reviewed in PRs.
- **API export for regulators:** `GET /api/admin/gdpr/ropa` (admin
  scope; returns the same data as JSON).
- **Human-readable copy (this file):** `docs/legal/RECORDS-OF-PROCESSING.md`.

If you change `PROCESSING_ACTIVITIES` in code, update this file in
the same commit.
