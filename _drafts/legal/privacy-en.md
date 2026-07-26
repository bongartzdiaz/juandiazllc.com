---
last_updated: 2026-05-12
locale: en
target_path: app/[locale]/legal/privacy/page.tsx
---

# Privacy Policy

This Privacy Policy explains how **LucenAI** (operated by **Juan Diaz LLC**, KvK [TBD], "we", "us") collects and processes Personal Data when you use our website **lucen.ai** or our CRM software **DEUS** (the "DEUS Service").

For data your employer has put inside DEUS, LucenAI acts as a Processor and your employer (the Customer) decides what is collected and why. This notice covers the data we process as Controller — visitors of our website, people who sign up for an account, and Authorized Users who interact with us directly.

## 1. Who we are

LucenAI is the brand of Juan Diaz LLC, registered in the Netherlands at [address TBD], KvK [TBD]. Reach us at:

- General: hello@lucen.ai
- Privacy: privacy@lucen.ai
- Legal: legal@lucen.ai

## 2. What we collect

| Category | Examples | Source |
|---|---|---|
| Account data | Name, work email, role, organization | You, when you sign up |
| Authentication data | Password hash, session tokens | Generated when you log in |
| Billing data | Company, VAT ID, invoice address | You, when you subscribe |
| Usage data | Pages visited, clicks, errors | Captured in-app |
| Technical data | IP, browser, OS | Captured automatically |
| Support data | Questions you send us, screenshots | You, in support emails |

We do not knowingly collect data from children under 16. We do not collect special-category data (health, race, religion) about Authorized Users.

## 3. Why we process this data

| Purpose | Legal basis (AVG Art. 6) |
|---|---|
| Provide and operate the DEUS Service | Contract — Art. 6(1)(b) |
| Send transactional emails (invites, password reset, invoices) | Contract — Art. 6(1)(b) |
| Detect and prevent abuse | Legitimate interest — Art. 6(1)(f) |
| Bill you and meet tax obligations | Legal obligation — Art. 6(1)(c) |
| Improve the Service through aggregated, non-identifying analytics | Legitimate interest — Art. 6(1)(f) |
| Send product updates by email | Consent — Art. 6(1)(a) |

We do not sell Personal Data. We do not use Personal Data to train AI models.

## 4. Sub-processors

We engage the following Sub-processors. The full live list is at **lucen.ai/legal/subprocessors**.

| Sub-processor | Purpose | Region |
|---|---|---|
| Hetzner Online GmbH | Hosting (compute + database + AI inference) | Falkenstein, Germany |
| Backblaze Inc. | Encrypted backup storage | Amsterdam, Netherlands |
| Stripe Payments Europe Ltd | Subscription billing | Ireland |
| Resend.com Inc. | Transactional email | EU region |
| Functional Software Inc. (Sentry) | Error monitoring | Frankfurt, Germany |
| Plausible Insights OÜ | Cookieless analytics | Estonia |

We notify you 30 days before adding or replacing a Sub-processor.

## 5. Where your data is stored

**[CORRECTED 2026-07-26 — the previous text described a Hetzner migration that never took place.]** Personal Data sits with Supabase (database, authentication) and Vercel (application hosting); payments run through Stripe Payments Europe Ltd in Ireland and email through Resend. The hosting region of each provider still has to be confirmed and will be stated in the sub-processor list. **One transfer leaves the EEA:** AI-assisted contact enrichment sends contact data to Anthropic in the United States.

## 6. AI processing

Where DEUS uses AI to score contacts, summarize deals, or generate insights, that processing runs on our own servers in Germany using open-source models. Your data is **not** sent to third-party AI APIs (OpenAI, Anthropic, Google, etc.).

## 7. Retention

| Data type | Retained for |
|---|---|
| Active account data | The duration of your Subscription |
| Encrypted backups | 30 days rolling |
| Soft-deleted accounts | 30 days, then hard-purged |
| Audit log | 24 months |
| Email delivery logs | 30 days |
| Error events | 90 days |

After hard-purge we keep only the audit row referencing the action, retained for 24 months as a legal-defense window.

## 8. Your rights

Under the AVG / GDPR you can:

- **Access** your data — Art. 15
- **Rectify** inaccurate data — Art. 16
- **Erase** your account — Art. 17 ("right to be forgotten")
- **Restrict** processing — Art. 18
- **Port** your data to another provider — Art. 20
- **Object** to processing — Art. 21
- **Withdraw consent** at any time — Art. 7(3)

To exercise any of these rights, log in and use **Settings → Privacy → Export my data** or **Delete my account**, or email **privacy@lucen.ai**. We respond within 30 days.

You also have the right to file a complaint with the Dutch Data Protection Authority (Autoriteit Persoonsgegevens) at **autoriteitpersoonsgegevens.nl**.

## 9. Cookies and tracking

We use **Plausible Analytics** for visitor metrics. Plausible is cookieless and does not track you across websites. **No consent banner is required because we set no cookies.**

DEUS uses one essential cookie to keep you logged in. This cookie is HttpOnly, Secure, and SameSite=Strict.

## 10. Security

We protect Personal Data with: TLS 1.2+ in transit; AES-256 at rest for backups; argon2id password hashing; role-based access control; full audit log; principle of least privilege for staff; 24-hour breach notification commitment to Customers (72 hours to authorities under Art. 33).

## 11. Calendar integrations and Art. 9 special categories

DEUS reads your Google Calendar or Microsoft 365 calendar with your explicit OAuth consent. **We deliberately limit what we persist** to keep special-category personal data (Art. 9 GDPR — health, religion, political opinion, etc.) out of the system:

- We **only persist events whose attendee list intersects with at least one CRM contact in your organization.** Personal appointments without any CRM contact are counted for sync-token bookkeeping but are **not stored**.
- We **never persist event descriptions** — they are the most likely place for clinical notes, legal-strategy memos, or other Art. 9 content.
- We **only store attendee emails that match a CRM contact**. Strangers' emails on your meetings are dropped before persistence.
- Customers in regulated verticals (healthcare, legal, financial) can enable **Settings → redact synced titles** so titles and locations are stored as one-way SHA-256 hashes instead of plaintext.
- Read-only — DEUS does not write to your calendar.

Token storage: OAuth access and refresh tokens are encrypted at rest using AES-256-GCM. Tokens never leave the encryption boundary unencrypted.

You can disconnect a calendar at any time from **Settings → Integrations**; this revokes our OAuth grant with the provider and marks all stored events for deletion at the next prune cycle (≤24 hours).

## 12. Updates to this notice

We update this Privacy Policy when our practices change. The "Last updated" date at the top reflects the current version. Material changes are emailed to all Authorized Users at least 30 days before they take effect.

## 13. Contact

Questions or requests: **privacy@lucen.ai**.
