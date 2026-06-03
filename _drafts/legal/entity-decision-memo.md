# Legal entity decision — DEUS / LucenAI

**Decision needed by:** before publishing the legal docs (`privacy`,
`tos`, `dpa`, `subprocessors`). The drafts in `_drafts/legal/*.md`
have `[KvK TBD]` and `[address TBD]` placeholders that need a real
entity behind them.

**Decision driver:** the DEUS customer base. If the first ten
customers are EU-based operators, the entity needs to be EU-resident
to make the GDPR posture clean. If the first ten are mixed EU and
US, it's a more nuanced call.

This memo answers three questions:

1. Which legal entity issues the contracts and processes the
   payments?
2. What does each option cost in time, money, and operational
   friction?
3. What's the recommended path given where DEUS is today?

---

## 1 · The current state

The branding everywhere in the codebase says **"Juan Diaz, LLC
operating the LucenAI brand"**. "Juan Diaz, LLC" reads as US-style.
The drafts under `_drafts/legal/*.md` were written with that wording
and a Dutch governing-law clause for the ToS, which is internally
inconsistent.

This memo resolves the inconsistency.

---

## 2 · The three realistic options

### Option A — NL BV (Besloten Vennootschap)

- **What it is:** Dutch private limited company.
- **Setup cost:** ~€1,000-2,500 (notary, KvK registration, possibly a
  startersaccountant). One-time.
- **Setup time:** 1-3 weeks.
- **Recurring cost:** ~€800-1,500/year (accountant for annual
  filing).
- **Liability:** limited — your personal assets are protected behind
  the BV.
- **Tax:** corporate income tax (~19% on first €200k profit, ~25.8%
  above). Salary you pay yourself is taxed normally.
- **GDPR posture:** EU-resident controller. Cleanest possible posture
  for EU customers. No transfer-mechanism question for the operating
  entity itself.
- **DPA execution:** you sign as director of the BV. Counterparties
  recognise it instantly as an EU company.
- **Customer perception:** trustworthy for EU operators, neutral for
  US.

### Option B — US LLC (current, "Juan Diaz, LLC")

- **What it is:** Delaware / Wyoming / similar US LLC. Already
  exists per the codebase comment.
- **Setup cost:** sunk.
- **Recurring cost:** ~$50-300/year (registered agent, state filing).
- **Liability:** limited.
- **Tax:** pass-through by default — you pay personal tax wherever
  you're tax-resident (NL?). State franchise tax and US federal
  reporting can apply depending on activity.
- **GDPR posture:** **complicated**. A US LLC processing EU customer
  data is a controller in a third country. Requires Standard
  Contractual Clauses or equivalent transfer mechanism in every DPA.
  Legally workable; not as clean as a BV.
- **DPA execution:** you sign as manager. EU counterparties read US
  LLC and ask follow-up questions about Schrems II, transfer impact
  assessments, etc.
- **Customer perception:** fine for US, slightly cautious for EU.

### Option C — Dutch eenmanszaak (sole proprietorship)

- **What it is:** unincorporated Dutch sole trader.
- **Setup cost:** ~€60 (KvK only).
- **Setup time:** same week.
- **Recurring cost:** minimal (no accountant required, but smart to
  have one).
- **Liability:** **unlimited** — your personal assets are exposed to
  business liability. For a CRM that processes other people's
  customer data this is a real consideration.
- **Tax:** personal income tax on all profit, plus the
  zelfstandigenaftrek and similar deductions while you qualify for
  them.
- **GDPR posture:** EU-resident controller. Same clean posture as a
  BV.
- **DPA execution:** you sign as the natural person. Counterparties
  occasionally ask whether the entity is incorporated; for B2B SaaS
  contracts that ask is usually answerable but not ideal.
- **Customer perception:** lowest barrier to start, lowest perceived
  permanence. For SaaS targeting business customers, an
  eenmanszaak signals "early stage" — not a deal-breaker but a
  signal.

---

## 3 · Comparison at a glance

| Dimension | A — NL BV | B — US LLC | C — Eenmanszaak |
|---|---|---|---|
| Setup cost | €1k-2.5k | sunk | €60 |
| Setup time | 1-3 weeks | done | 1 day |
| Recurring cost | €800-1.5k/yr | $50-300/yr | minimal |
| Liability protection | yes | yes | **no** |
| GDPR controller posture | clean (EU) | requires SCCs | clean (EU) |
| Tax posture for an NL-resident founder | clean separation | dual-jurisdiction complexity | clean, personal |
| Counterparty signal for EU B2B SaaS | strongest | mixed | weakest |
| Time-to-launch impact | adds 1-3 weeks if not started | zero | 1 day |

---

## 4 · The recommendation

**If the first three to ten DEUS customers will be predominantly EU
(NL / DE / ES / BE):**

→ **Option A — NL BV** is the right long-term home. It's clean for
GDPR, signals permanence to B2B counterparties, and protects your
personal assets when DEUS starts holding other people's customer
data at meaningful volume.

The 1-3 week setup time is the only real cost. If a notary
appointment is reachable inside that window, start the process now
and launch under the **existing entity (Option B or C, whichever you
already have)** as a stop-gap, then re-paper customers onto the BV
once it's incorporated. The repaper is a five-line addendum signed
on both sides.

**If the first three to ten will be mixed EU/US or unclear:**

→ Stay on **Option B (Juan Diaz, LLC)** for the soft launch, but add
the SCC fallback clause to the draft DPA so the GDPR posture is
defensible. Move to a BV in Q3 when revenue justifies the setup
overhead.

**Don't pick Option C.** The unlimited liability on a SaaS that
processes calendar data, contacts and deals across multiple
customers is a single-incident-from-bad situation. The €60 saved is
not worth that exposure.

---

## 5 · What the placeholders need

Once you've picked an option, the following fields must be filled in
the `_drafts/legal/*.md` documents and any other public-facing legal
copy. The KvK is the most urgent — three out of four documents
reference it.

| Field | Where it appears | Notes |
|---|---|---|
| Legal entity name | privacy, tos, dpa, subprocessors, imprint | Exactly as registered |
| KvK / registration number | privacy, tos, dpa, imprint | Always cite |
| BTW / VAT number | imprint, invoice templates | Required for EU B2B |
| Registered address | imprint, privacy, dpa | Real street address; PO Box not acceptable in NL |
| Director / signatory name | dpa | Signs on behalf of the entity |
| Governing law | tos, dpa | NL law if BV; the existing draft picks NL — confirm |
| Disputes forum | tos, dpa | Currently "Amsterdam" — keep |
| Privacy contact email | privacy | Should match `privacy@lucen.ai` |
| Security disclosures | privacy, security.txt | Should match `security@lucen.ai` |

---

## 6 · Action items

If picking **Option A (BV)** and willing to add 1-3 weeks:

- [ ] Call a Dutch notary today (any of: NotarisOnline, DoeHetZelfNotaris,
      a referral). Quote: "incorporating a BV for a software company,
      single shareholder, single director, simple deed."
- [ ] Decide the BV name — `LucenAI BV` is the obvious choice.
- [ ] Confirm registered address — your home is fine if you're
      comfortable with it being on a public KvK record; otherwise a
      virtual-office service in Amsterdam (€30-100/month).
- [ ] Set up a business bank account once the KvK is issued (Bunq
      Business or N26 Business are fastest).
- [ ] Re-issue the legal docs with the BV details.

If picking **Option B (existing US LLC) for soft launch**:

- [ ] Confirm the US LLC's full registered name and state.
- [ ] Get a registered agent address if you don't have one already.
- [ ] Update the `_drafts/legal/*.md` placeholders accordingly.
- [ ] Add an explicit "data processor in a third country" SCC clause
      to the DPA template.
- [ ] Plan the BV migration for Q3 / once revenue justifies.

---

## 7 · Document control

| Item | Value |
|---|---|
| Decision owner | Juan Diaz |
| Stakeholders | Hash, customer #1 (perception only) |
| Decision deadline | before legal docs publish, before customer #1 signs |
| Reversibility | medium — switching entities is doable but creates re-papering work |
| Confidence in recommendation | high if EU-heavy customer base, moderate if mixed |
