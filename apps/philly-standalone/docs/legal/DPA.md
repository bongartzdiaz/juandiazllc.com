# Data Processing Agreement (DPA) — template

_Use this template when an external organisation acts as a **processor**
on behalf of the controller — for example a sub-contractor running
analytics, a managed-hosting partner, or a third-party AI provider.
Adjust the bracketed fields and review with counsel before signing._

This DPA is governed by Article 28 of the General Data Protection
Regulation (Regulation (EU) 2016/679, "GDPR") and forms part of
the underlying services agreement ("Main Agreement") between:

- **Controller:** \<LEGAL ENTITY>, \<ADDRESS> (the "Controller")
- **Processor:** \<LEGAL ENTITY>, \<ADDRESS> (the "Processor")

## 1. Subject matter and duration

The Processor processes personal data on behalf of the Controller
solely to perform the services described in the Main Agreement, for
the duration of that agreement plus any post-termination period
required for return or deletion of the data.

## 2. Nature, purpose and categories

| Item                   | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| Nature of processing   | \<E.g. hosting, analytics, AI inference, email delivery>   |
| Purpose                | Performance of the Main Agreement                          |
| Categories of subjects | CRM operators; contacts and counterparties of the Controller |
| Categories of data     | As described in `lib/gdpr/pii-registry.ts`                 |
| Sensitive categories   | None (Art. 9 GDPR)                                         |

## 3. Processor's obligations (Art. 28(3) GDPR)

The Processor shall:

1. **Process only on documented instructions** from the Controller,
   including for transfers of personal data to a third country,
   unless required to do so by Union or Member State law (in which
   case the Processor shall inform the Controller before processing).
2. Ensure that **persons authorised to process** the personal data
   are bound by confidentiality.
3. Implement appropriate **technical and organisational measures**
   under Art. 32, including those listed in Annex II.
4. Engage a **sub-processor** only with prior specific or general
   written authorisation of the Controller. A current list is at
   Annex III; the Processor shall give 30 days' notice of additions
   or replacements, during which the Controller may object.
5. **Assist the Controller** in fulfilling its obligations under
   Articles 12–22 (data subject rights), 32 (security), 33–34 (breach
   notification), and 35–36 (DPIAs and prior consultation).
6. **Delete or return** all personal data at the Controller's choice
   at the end of the services, and delete existing copies unless
   Union or Member State law requires storage.
7. **Make available all information** necessary to demonstrate
   compliance with this Article 28, and allow for and contribute to
   audits, including inspections, conducted by the Controller or
   another auditor mandated by the Controller.

The Processor shall immediately inform the Controller if, in its
opinion, an instruction infringes the GDPR or other Union or Member
State data-protection provisions.

## 4. International transfers

If the Processor transfers personal data outside the European
Economic Area, the transfer shall be governed by the European
Commission's Standard Contractual Clauses (Decision 2021/914), Module
2 (Controller-to-Processor) or Module 3 (Processor-to-Sub-Processor)
as applicable. A current Transfer Impact Assessment is at Annex IV.

## 5. Personal-data breach

The Processor shall notify the Controller without undue delay — and
in any case within 24 hours — of becoming aware of a personal-data
breach. The notification shall include the information required
under Art. 33(3) GDPR. The Controller's breach-response runbook
(see `docs/legal/BREACH-RESPONSE.md`) sets out the joint response.

## 6. Sub-processors (Annex III)

| Name | Service          | Country | Transfer mechanism |
| ---- | ---------------- | ------- | ------------------ |
| \<>  | \<E.g. hosting>  | \<>     | \<E.g. EEA / SCCs> |

## 7. Liability and term

Liability under this DPA follows the limitation-of-liability terms
in the Main Agreement. This DPA terminates automatically when the
Main Agreement terminates. Clauses that by their nature should
survive (audit, return, breach notification) survive termination.

---

**Signed for the Controller:** ______________________ Date: __________

**Signed for the Processor:**  ______________________ Date: __________

## Annex I — Description of processing

(See sections 1 and 2 above.)

## Annex II — Technical and organisational measures

The Processor shall implement and maintain at least the following
measures, evaluated against Art. 32(1):

- **Access control:** RBAC, principle of least privilege, MFA on
  privileged accounts.
- **Encryption:** TLS 1.2+ in transit; AES-256 (or equivalent) at
  rest for personal data.
- **Audit log:** append-only, retained for at least 12 months.
- **Backup:** point-in-time recovery with documented RPO and RTO.
- **Vulnerability management:** dependency scanning at least weekly;
  critical patches applied within 7 days of disclosure.
- **Personnel:** background checks where lawful, GDPR training
  on hire and annually thereafter.
- **Sub-processor due diligence:** documented review at onboarding
  and annually thereafter.

## Annex III — Approved sub-processors

(Maintain in the table above; reissue this DPA on material change.)

## Annex IV — Transfer Impact Assessment summary

(Attach the full TIA as a separate document.)
