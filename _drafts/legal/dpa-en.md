---
last_updated: 2026-05-12
type: Data Processing Agreement
target_path: public/legal/dpa-2026-05.md
---

# Data Processing Agreement

This Data Processing Agreement ("DPA") forms part of the Terms of Service between **Juan Diaz LLC**, trading as **LucenAI** ("Processor", "we") and the Customer signing up for the DEUS Service ("Controller", "you"). It governs the processing of Personal Data we carry out on your behalf.

## 1. Definitions

Terms not defined here have the meaning given in the AVG / GDPR.

- **AVG / GDPR** — Regulation (EU) 2016/679.
- **DEUS Service** — the customer-relationship-management software provided at app.lucen.ai.
- **Authorized User** — an individual that the Controller authorizes to use the DEUS Service.
- **Personal Data** — any information relating to an identified or identifiable natural person processed by us under this DPA.
- **Sub-processor** — any third party we engage to process Personal Data on the Controller's behalf.
- **Affected Person** — a data subject under Art. 4(1) AVG.

## 2. Subject matter and duration

We process Personal Data on the Controller's behalf for the duration of the Customer's subscription to the DEUS Service. This DPA terminates automatically with the underlying subscription. Sections 8, 9, 11, and 12 survive termination.

## 3. Nature and purpose of processing

We process Personal Data only to provide the DEUS Service: store, retrieve, organize, search, transmit, and secure the data the Controller and its Authorized Users put into the system. We do not process Personal Data for any other purpose.

## 4. Categories of Personal Data and Affected Persons

**Affected Persons** — Authorized Users; Controller's contacts (leads, customers, vendors); third parties whose data the Controller imports.

**Categories** — name; contact details (email, phone, address); employer and job title; communication content; activity timestamps; user-generated notes; deal and transaction values; uploaded files (e.g., contracts, photos, ID documents if uploaded by the Controller).

The Controller decides what data enters the DEUS Service. We have no influence on its content.

## 5. Controller's instructions

We process Personal Data only on the Controller's documented instructions. The instructions are this DPA, the configuration the Controller chooses in DEUS, and any written instructions sent to legal@lucen.ai.

We will inform the Controller if we believe an instruction infringes the AVG. We will not act on the suspicious instruction until the Controller confirms or modifies it.

## 6. Confidentiality

Anyone authorized by us to process Personal Data is bound by a written confidentiality obligation that survives the end of their engagement.

## 7. Security measures

We implement the following technical and organizational measures, reviewed at least annually:

| Area | Measure |
|---|---|
| Encryption | TLS 1.2+ for data in transit; AES-256 for backups at rest; argon2id for password hashing |
| Access control | Role-based access; least privilege; multi-factor authentication for staff with production access |
| Network | Private network between application and database; firewall with default-deny |
| Monitoring | Centralized error log (Sentry); 24-month audit trail of administrative actions |
| Backups | Encrypted nightly backups to a separate region (Amsterdam); 30-day retention; restore drills monthly |
| Resilience | Health checks; documented disaster-recovery plan |
| Personnel | Background check on staff with data access; security training annually |
| Incident response | 24-hour internal escalation; 72-hour notification to Controller and authority |

## 8. Sub-processors

The Controller authorizes the engagement of the following Sub-processors:

| Sub-processor | Purpose | Region |
|---|---|---|
| Hetzner Online GmbH | Compute, database, AI inference | Falkenstein, Germany |
| Backblaze Inc. | Encrypted backup storage | Amsterdam, Netherlands |
| Stripe Payments Europe Ltd | Subscription billing | Ireland |
| Resend.com Inc. | Transactional email | EU region |
| Functional Software Inc. (Sentry) | Error monitoring | Frankfurt, Germany |
| Plausible Insights OÜ | Cookieless analytics | Estonia |

We notify the Controller at least 30 days before engaging a new or replacement Sub-processor by emailing the Authorized User registered as the Customer's billing contact. The Controller may object on reasonable data-protection grounds within 14 days; if the parties cannot resolve the objection, the Controller may terminate the subscription and receive a pro-rata refund.

## 9. Data subject rights

We assist the Controller in responding to Affected Person requests under AVG Art. 15-22 by providing self-serve tools inside the DEUS Service:

- **Export** — every Authorized User can download a JSON archive of their data via Settings → Privacy → Export my data.
- **Delete** — every Authorized User can request account erasure via Settings → Privacy → Delete my account.
- **Rectify** — Authorized Users can edit their own data; Controllers can edit data they have entered.

For requests we cannot fulfil from inside DEUS, contact privacy@lucen.ai. We respond within 7 days.

## 10. International transfers

We do not transfer Personal Data outside the European Economic Area. All processing happens on infrastructure located in EU member states. If this changes, we will notify the Controller in advance and offer Standard Contractual Clauses as the transfer safeguard.

## 11. Data breach

If we discover a Personal Data breach we will notify the Controller without undue delay and in any event within 24 hours of discovery. Our notice will include: nature of the breach; categories of data and Affected Persons; likely consequences; measures taken or proposed.

The Controller is responsible for notifying the relevant supervisory authority (within 72 hours per Art. 33) and, where required, Affected Persons.

## 12. Audit rights

The Controller may audit our compliance with this DPA once per twelve-month period at its own cost, with at least 30 days' written notice, during business hours, in a way that does not disrupt our operations or the data of other customers. We provide our annual security report on request before any on-site audit is requested.

## 13. Termination — return and deletion

On termination of the subscription, we will, at the Controller's choice:

- (a) make available a final JSON export for 30 days, then delete; or
- (b) delete all Customer Personal Data within 30 days.

Encrypted backup copies are deleted on the next backup rotation, no later than 60 days after subscription termination. We retain the audit log for 24 months for legal-defense purposes.

## 14. Liability

Our total liability under this DPA is capped at 12 months of fees paid by the Controller in the 12 months preceding the event giving rise to liability. This cap does not apply to fines imposed by a supervisory authority directly attributable to our breach of this DPA.

## 15. Order of precedence

If this DPA conflicts with the Terms of Service, this DPA prevails for matters of Personal Data processing.

## 16. Governing law

This DPA is governed by Dutch law. Disputes are subject to the exclusive jurisdiction of the District Court of Amsterdam.

---

**Customer signature**

Name: _________________________
Title: _________________________
Date: _________________________
Signature: _____________________

**For LucenAI (Juan Diaz LLC)**

Name: Juan Diaz
Title: Director
Date: _________________________
Signature: _____________________
