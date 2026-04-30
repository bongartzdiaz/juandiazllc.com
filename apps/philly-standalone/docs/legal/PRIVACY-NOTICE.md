# Privacy notice

_Template — adapt to the controller's identity and jurisdiction before publishing._

**Last updated:** [TO FILL: publication date in YYYY-MM-DD]
**Controller:** [TO FILL: legal entity name], [TO FILL: registered address]
**Contact:** [TO FILL: privacy@yourdomain.com]
**Data Protection Officer (if appointed):** [TO FILL: name + email, or "not appointed — controller is the contact"]

This notice explains how the Philly CRM ("the platform") processes
personal data, in plain language, alongside the legal references
required by Articles 12–14 of the General Data Protection Regulation
(EU 2016/679, "GDPR"). The complete Records of Processing
Activities (RoPA) are kept under [`lib/gdpr/ropa.ts`](../../lib/gdpr/ropa.ts)
and are available on request.

## 1. Who we are

The controller is the legal entity identified above. We process
personal data of:

- **CRM operators** — employees of the controller who use the platform.
- **Contacts and counterparties** — third parties whose details are
  recorded in the platform (leads, donors, partners, volunteers,
  hospitality guests, real-estate counterparties, signatories of
  contracts, etc.).

If you are a contact / counterparty whose data is held by a CRM
operator, the operator is the controller of that data. Please direct
data-subject requests to the operator first; we will assist them in
fulfilling your request.

## 2. What we collect and why

We hold the categories of personal data listed in [`lib/gdpr/pii-registry.ts`](../../lib/gdpr/pii-registry.ts).
The full processing register lives at [`lib/gdpr/ropa.ts`](../../lib/gdpr/ropa.ts).
Summary:

| Activity                          | Lawful basis              | Retention      |
| --------------------------------- | ------------------------- | -------------- |
| Operator authentication           | Contract (Art. 6(1)(b))   | Employment + 7y |
| Business-relationship management  | Legitimate interest (Art. 6(1)(f)) | 3 years        |
| Hospitality reservations          | Contract                  | 5 years        |
| Volunteer roster                  | Consent (Art. 6(1)(a))    | 2 years        |
| Open-house visitor capture        | Consent                   | 1 year         |
| Email & SMS correspondence        | Legitimate interest       | 3 years        |
| Electronic signatures             | Contract                  | 10 years       |
| Security & compliance audit log   | Legal obligation (Art. 6(1)(c)) | 1 year         |
| Proof-of-erasure register         | Legal obligation          | Indefinite (hashes only) |

We do **not** process special-category data (Art. 9) such as health,
race, political opinions, or biometrics, and do **not** profile data
subjects for automated decision-making with legal effects (Art. 22).

## 3. Your rights

Under Articles 15–22 GDPR you may:

- **Access** — request a copy of your personal data (Art. 15).
- **Rectify** — correct inaccurate data (Art. 16).
- **Erase** — request deletion (Art. 17).
- **Restrict** — pause processing while a dispute is resolved (Art. 18).
- **Port** — receive your data in a machine-readable format (Art. 20).
- **Object** — to processing under legitimate interest (Art. 21).
- **Withdraw consent** — where processing is based on consent (Art. 7(3)).
- **Lodge a complaint** — with your supervisory authority. In the
  Netherlands: Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).

### How to exercise your rights

- **CRM operators** can self-serve at:
  - Account data export: `GET /api/me/data-export`
  - Schedule account deletion: `POST /api/me/account-deletion` (30-day grace; cancel via `DELETE` on the same path)
- **Contacts and counterparties** should write to [TO FILL: privacy@yourdomain.com].
  We respond within 30 days (Art. 12(3)). If the request is complex
  we may extend by a further 60 days and will tell you so within the
  first 30.

## 4. Recipients & transfers

We share data only with:

- **Auth provider** — Supabase (EU region for our deployments).
- **Email / SMS providers** — configured per-organisation under the
  Integrations table; transfers to the United States are governed by
  Standard Contractual Clauses (SCCs).
- **E-signature providers** — DocuSign / HelloSign / PandaDoc, also
  under SCCs.

We do not sell personal data and do not share data with advertising
networks.

## 5. Security

The platform implements (non-exhaustive):

- Tenancy isolation via per-organisation scoping on every database query.
- Role-based access control with per-section allow-lists.
- Append-only audit log of all create / update / delete actions.
- TOTP-based two-factor authentication for high-privilege accounts.
- Account lockout after repeated failed login attempts.
- TLS 1.2+ in transit; encryption at rest provided by the database host.
- TOTP secrets and provider OAuth tokens encrypted at the application layer.

A description of technical and organisational measures by processing
activity is in [`lib/gdpr/ropa.ts`](../../lib/gdpr/ropa.ts).

## 6. Cookies

The platform sets only **strictly necessary** cookies — a Supabase
session cookie and a UI-language preference cookie. Both are
exempt from the consent requirement under Recital 30 GDPR and the
ePrivacy Directive (Art. 5(3) exemption for cookies "strictly
necessary" to provide a service explicitly requested). No analytics,
advertising, or cross-site tracking cookies are set.

## 7. Changes to this notice

We will tell affected data subjects directly when we make a material
change to this notice.
