# Data Protection Impact Assessment — AI Attributes on Contacts

_GDPR Article 35 requires a DPIA where processing "is likely to result
in a high risk to the rights and freedoms of natural persons", in
particular for "systematic and extensive evaluation of personal
aspects … based on automated processing, including profiling".
The AI Attributes feature performs scoring (the ICP-fit score) and
profiling (industry inference, narrative summary), so a DPIA is
mandatory under Art. 35 §3(a) and is also required for high-risk AI
systems under EU AI Act Art. 27._

| Field | Value |
| ---- | ---- |
| **Activity** | `ai_contact_enrichment` (see `lib/gdpr/ropa.ts`) |
| **Owner** | _\<NAME, ROLE\>_ |
| **DPO consulted** | _\<YES / NO + DATE\>_ |
| **First version** | _\<DATE\>_ |
| **Last reviewed** | _\<DATE\>_ |
| **Review cadence** | Annual + on any change to model, prompt, or downstream use |

---

## 1. Description of the processing

### 1.1 What it does
The feature uses Anthropic's Claude Haiku 4.5 to infer three
structured attributes about an existing CRM contact:

- `aiIndustry` — short plain-English industry label (e.g. "Residential
  solar", "SaaS — devtools").
- `aiIcpFit` — integer 0–100 representing how well the contact
  matches the controller's ideal-customer profile.
- `aiSummary` — one paragraph (≤420 chars) describing who the contact
  likely is and what an opener might look like.

### 1.2 What data goes into the prompt
Only data the controller has already lawfully collected on the
`Contact` row: name, email, phone, company, contact type, free-text
notes (truncated to 1,500 chars in
`lib/philly/ai/contact-attributes.ts`), and lead source.
**No internal IDs, no cross-org data, no other customer's data**.

### 1.3 When it runs
- **Once at create-time** — `POST /api/contacts` schedules it via
  Next.js `after()` so the response returns instantly while
  enrichment finishes in the background.
- **On demand** — operators can press a "Regenerate" button on the
  contact detail page, which calls
  `POST /api/contacts/[id]/ai-attributes`. This route is rate-limited
  to 10 calls per user per minute and wrapped in
  `withSpan({ slo: SLO.AI_ACTION })`.

### 1.4 What it does **not** do
- Does **not** auto-route leads, auto-assign, or auto-reject. The
  ICP-fit score is **decision-support only**. A human operator
  decides every downstream action.
- Does **not** make inferences about special-category data (race,
  health, religion, sexual orientation, political opinion). The Zod
  schema constrains outputs to neutral business labels; the system
  prompt forbids speculation.
- Does **not** chain into any third-party advertising or
  data-broker ecosystem.

---

## 2. Necessity & proportionality

### 2.1 Lawful basis
**Legitimate interest** — Art. 6(1)(f). The controller has a real
business need to triage business contacts efficiently in a B2B
context. The contact's reasonable expectation, as a B2B contact
recorded by an organisation they have already engaged with, includes
that the organisation will assess fit before reaching out.

The Art. 6(1)(f) balancing test is summarised below.

### 2.2 LIA — Legitimate Interest Assessment

| | |
| ---- | ---- |
| **Purpose test** | Yes — efficient B2B pipeline triage is a legitimate operator interest. |
| **Necessity test** | The same triage could in theory be done manually, but at scale the cost is prohibitive and the result no more accurate. Automated inference from already-collected data is the least-intrusive way to achieve the purpose. |
| **Balancing test** | Mitigations below ensure the data subject's interests do not override the operator's, but this is conditional — see §3 risks. |
| **Outcome** | LIA passes provided the §3 mitigations remain in place. |

### 2.3 Data minimisation
- Only data already on the row is sent to the model.
- Notes truncated to 1,500 chars.
- No bulk/batch inference; one contact per call.
- No prompt logging beyond the request lifetime.

### 2.4 Storage limitation
Outputs are stored on the contact row and inherit its retention.
When the contact is purged by `lib/gdpr/retention.ts` or by an
admin-led erasure (`/api/admin/gdpr/erase`), the AI fields are
deleted with it.

---

## 3. Risks identified & mitigations

| # | Risk | Likelihood | Severity | Mitigation |
| -- | ---- | ---- | ---- | ---- |
| 1 | **Hallucination** — the model invents a fact about the contact (a job title, a company size, a pain point). | Medium | Medium | System prompt explicitly requires hedging when input is sparse; Zod schema rejects malformed outputs; UI badge labels every field as "AI generated" so operators do not treat it as fact. |
| 2 | **Bias** — the model scores ICP-fit unfairly along nationality, ethnicity, or gender lines because of patterns in its training data. | Medium | High | Prompt explicitly instructs the model never to use special-category attributes; ICP-fit is decision-support, not auto-action; score is observable in the audit log so a controller can sample-audit for bias. |
| 3 | **Solely-automated decision** (Art. 22). | Low | High | The score never auto-routes leads or auto-rejects contacts. A human operator is always required before any downstream contact attempt. |
| 4 | **Cross-tenant leakage** — prompt accidentally includes data from another organisation. | Very low | Critical | The prompt is built from a single Prisma `findFirst` where-clause that includes the requesting `organizationId`; tested by `npm run audit:tenant`. |
| 5 | **Provider data retention** — Anthropic retains the prompt or completion. | Low | Medium | API key is configured for zero retention; Anthropic DPA + EU SCCs cover the legal side. |
| 6 | **Unintended profiling of EU residents** in a way that triggers Art. 22. | Low | High | Decision-support framing in product copy + UI; operators trained to use the score as a hint, not a verdict. |
| 7 | **Re-identification via summary text** stored in the database. | Low | Low | Summary is generated *from* data already on the row, so no new identifying information is created. |
| 8 | **Supply-chain / model swap** — Anthropic ships a new model that subtly shifts behaviour. | Medium | Medium | Model ID pinned in `MODEL_ID = 'claude-haiku-4-5-20251001'` (`lib/philly/ai/contact-attributes.ts`); changes go through PR review + this DPIA must be re-reviewed when MODEL_ID changes. |

---

## 4. Transparency (EU AI Act Art. 50)

The AI Act requires that natural persons interacting with AI-generated
content be informed of that fact. We comply via:

1. A persistent **"AI generated"** badge on every inferred field on
   the contact detail page (`components/philly/contacts/AiAttributesCard.tsx`).
2. A "Last regenerated at" timestamp visible to operators.
3. A privacy-notice clause that names this activity by ID
   (`ai_contact_enrichment`) and links to this DPIA.
4. The opt-out path — an operator can leave the AI fields empty and
   never press "Regenerate"; the row continues to function without
   any AI-derived values.

A controller who must inform their *contacts* (rather than their
operators) about this processing should reference this activity
in their own privacy notice — sample text is in the
[Privacy Notice template](./PRIVACY-NOTICE.md) §4.

---

## 5. Sign-off

| | |
| ---- | ---- |
| **Outcome** | Residual risk acceptable subject to mitigations §3 |
| **DPO sign-off** | _\<NAME / DATE\>_ |
| **Controller sign-off** | _\<NAME / DATE\>_ |
| **Trigger for re-DPIA** | Change of `MODEL_ID`; change of recipient sub-processor; expansion of input fields beyond the current set; addition of an auto-action downstream of the score. |
