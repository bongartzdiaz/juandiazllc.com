# Personal-data breach response runbook

_Authority: GDPR Articles 33 (notification to supervisory authority)
and 34 (communication to the data subject). The 72-hour clock in
Art. 33(1) starts when **any person within the controller** "becomes
aware" of a breach — not when senior management is told. Treat
discovery as the start of the clock._

This runbook is the playbook the on-call engineer + Incident
Commander follow when a personal-data breach is suspected or
confirmed.

## 0. Definitions

A **personal-data breach** is "a breach of security leading to the
accidental or unlawful destruction, loss, alteration, unauthorised
disclosure of, or access to, personal data transmitted, stored or
otherwise processed" (Art. 4(12) GDPR). It includes:

- An attacker exfiltrating a database table or backup.
- A laptop with unencrypted CRM data being lost.
- A misconfigured API returning another tenant's records.
- A bug deleting personal data we cannot restore.
- A processor (or sub-processor) reporting a breach upstream.

## 1. T+0 to T+1h — Triage

| Step | Owner          | Action                                                                 |
| ---- | -------------- | ---------------------------------------------------------------------- |
| 1    | Discoverer     | Open an incident in the on-call channel. Tag `#privacy`.               |
| 2    | On-call eng    | Page the Incident Commander (IC) and the privacy on-call.              |
| 3    | IC             | Start a private incident document. **Start the 72-hour clock.**        |
| 4    | On-call eng    | Contain — kill the leaking endpoint, rotate the leaked credential, etc. |
| 5    | IC             | Decide: confirmed breach? possible breach? false alarm?                |

If the answer to step 5 is anything other than "false alarm with
evidence," continue to section 2.

## 2. T+1h to T+24h — Investigate

Establish the facts you'll need for the Art. 33(3) notification.
Do not delete logs or evidence; copy them to a write-locked bucket.

- **Nature of the breach:** what happened, how, when did it start
  and end, how was it discovered?
- **Categories and approximate number of data subjects** concerned
  (Art. 33(3)(a)). Use the PII registry to enumerate models touched.
- **Categories and approximate number of records** concerned.
- **Likely consequences** for the data subjects (Art. 33(3)(c)).
- **Measures taken or proposed** to address the breach and mitigate
  possible adverse effects (Art. 33(3)(d)).
- **Contact point:** the Data Protection Officer or another single
  contact for the supervisory authority.

The privacy on-call drafts a one-page incident summary against this
checklist. The IC keeps the timeline up to date in the incident doc.

## 3. T+24h to T+72h — Decide and notify

### 3.1 Risk assessment

Decide whether the breach is "likely to result in a risk to the
rights and freedoms of natural persons" (Art. 33(1)). If yes →
notify the supervisory authority. If the risk is **high** → also
notify the affected data subjects (Art. 34(1)).

Use these factors (EDPB Guidelines 9/2022 §44):

- Type of breach (confidentiality / integrity / availability).
- Sensitivity of the data (basic / contact / identifier / financial).
- Volume of records and persons.
- Identifiability of data subjects.
- Severity of consequences.

### 3.2 Notify the supervisory authority

**Deadline:** within 72 hours of becoming aware.
**Where to send:** the lead supervisory authority for the controller's
main establishment. For establishments in the Netherlands this is
**Autoriteit Persoonsgegevens** at <https://autoriteitpersoonsgegevens.nl>.
For Cyprus: Office of the Commissioner for Personal Data Protection.

If the full picture isn't known by T+72h, file the **provisional
notification** with the information you have and follow up "in
phases without undue further delay" (Art. 33(4)).

### 3.3 Notify data subjects (when required)

If the breach is likely to result in a **high risk** to the
data subjects' rights and freedoms (Art. 34), send a clear and plain
communication describing:

- The nature of the breach.
- The contact point.
- The likely consequences.
- The measures taken or proposed.

Exemptions (Art. 34(3)): the data was encrypted; subsequent measures
have rendered the high risk no longer likely; or individual notice
would involve disproportionate effort (in which case use a public
communication).

### 3.4 Notify processors

If a processor's actions caused the breach, the controller already
heard from them under Art. 33(2). If a sub-processor of ours caused
it, escalate via the affected processor and document the chain.

## 4. T+72h to T+7d — Remediate

- Patch the root cause; deploy and verify.
- Rotate any credential that was — or could have been — exposed.
- Add a regression test that fails on the original bug.
- Update the audit log with the IC's incident-doc URL.
- Write the post-incident review (PIR).

## 5. PIR (post-incident review)

Within 7 working days, publish an internal PIR covering:

- Detection: how did we find out, and could we have found out sooner?
- Containment: what worked, what didn't?
- Notification: did we hit the 72-hour deadline?
- Lessons: 3–5 concrete follow-ups with owners and dates.

The PIR is internal. A redacted summary may be shared with the
supervisory authority on request.

## 6. Internal records

Even when the breach does **not** require external notification, the
controller must document it internally per Art. 33(5). The
`GdprErasureLog` and `AuditLog` tables, plus the incident doc, are
the canonical record. Retain for at least 6 years.

## Appendix A — On-call contact list

| Role                  | Primary           | Backup            |
| --------------------- | ----------------- | ----------------- |
| Incident Commander    | [TO FILL: name + email] | [TO FILL: name + email] |
| Privacy on-call (DPO) | [TO FILL: name + email] | [TO FILL: name + email] |
| Engineering on-call   | rotating          | rotating          |
| Communications lead   | [TO FILL: name + email] | [TO FILL: name + email] |
| Outside counsel       | [TO FILL: firm + email] | —                 |

## Appendix B — Notification template (supervisory authority)

> Subject: Notification of a personal-data breach pursuant to Article 33 GDPR
>
> 1. Nature of the breach: [describe]
> 2. Categories and approximate number of data subjects concerned: [N]
> 3. Categories and approximate number of records concerned: [N]
> 4. Likely consequences: [describe]
> 5. Measures taken or proposed: [describe]
> 6. Contact point for further information: [TO FILL: DPO email]
