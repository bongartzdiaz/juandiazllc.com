---
target_path: signed PDF + scan in Supabase storage bucket "side-letters/"
locale: en (NL versie volgt na sign-off)
purpose: Single-page side letter waarmee beta-cohort klanten en
         Juan Diaz LLC een lifetime-prijs-lock vastleggen.
status: DRAFT — nog niet door advocaat gereviewd. Niet versturen
         voor sign-off (zie checklist onderaan).
---

# Side Letter — DEUS Beta Cohort Pricing Lock

**Between:**

[**Customer Name**] (KvK [number]) — hereafter **Customer**

and

[**Juan Diaz LLC** — confirm legal entity + KvK + address] —
hereafter **Provider**

**Effective date:** [date of signature, on or after Customer's
first paid invoice]

**Reference:** This letter supplements the standard DEUS Terms of
Service ("ToS") and Data Processing Agreement ("DPA") executed
between the same parties.

---

## 1. Beta cohort acknowledgement

Provider operates a closed beta program for the first five (5)
paying customers of the DEUS service. Customer is one of those
five customers (specifically: customer number **[N]** of 5).

Customer acknowledges that DEUS is in active development, and that
features, performance, and availability may change without
advance notice. Provider acknowledges that Customer's feedback,
patience, and willingness to be a reference are valuable
contributions to DEUS's development.

This letter records the price lock that Provider grants Customer
in recognition of that contribution.

---

## 2. Pricing — locked

Customer's monthly subscription fee for the DEUS service is fixed
at **ninety-nine euros (€99) per month**, excluding VAT, for the
entire duration of Customer's organisation's use of the service.

This price applies regardless of:

- Increases in the public price of DEUS (currently planned to rise
  to €149/month when beta cohort spots are filled)
- Introduction of new tiers, features, or premium add-ons
- Inflation, cost-of-living adjustments, or operational expense
  increases incurred by Provider
- Changes in Provider's legal entity, ownership, or rebranding
  (subject to Section 5)

Provider may not unilaterally raise this price. Any change
requires Customer's express written agreement.

---

## 3. Scope of the locked price

The €99/month locked rate includes:

- Up to twenty-five (25) active user accounts within Customer's
  organisation
- All features classified as "core" or "professional" in the public
  DEUS pricing page, including any features added during the
  Customer's tenure (no "feature paywall" upgrades)
- AI-powered features (lead scoring, auto-attributes, summaries)
  with reasonable usage as defined in the ToS
- Calendar push-sync (Google Calendar and Microsoft 365)
- Audit log retention for the lifetime of Customer's organisation
- Standard support (priority email, four-hour business-hours
  response)

Excluded from the locked price:

- Migration service (one-time €1.500, optional)
- Enterprise-only features such as dedicated infrastructure or
  custom SLAs (these are explicitly carved out)

---

## 4. Customer commitments

In exchange for the locked price, Customer agrees to the
following, **for the first six (6) months only**:

- Participate in a thirty-minute (30 min) feedback call once per
  calendar month, to be scheduled at mutually convenient times
- Respond, where reasonable, to product-design questions from
  Provider within forty-eight (48) hours
- Permit Provider to mention Customer's organisation by name on
  the DEUS customers page after month three (3), unless Customer
  declines that reference in writing

After month six, these obligations end. Customer keeps the locked
price regardless of whether they continue providing feedback,
references, or anything else.

---

## 5. Continuity

The locked price survives:

- Provider's rebranding, including any change of trade name from
  "DEUS" or "Lucen.ai" to a successor brand
- Provider's relocation to different infrastructure (e.g. moving
  servers from Hetzner to another EU provider)
- Acquisition of Provider by a third party, provided that the
  successor entity continues offering the same or substantially
  similar service. If the successor discontinues the service,
  Customer is entitled to a full export of their data (per the
  DPA) and reasonable migration assistance.

The locked price terminates if:

- Customer's organisation ceases to exist (legal dissolution,
  merger into a non-customer entity)
- Customer fails to pay agreed invoices for sixty (60) consecutive
  days, after which the standard ToS termination clause applies

The locked price does **not** transfer to a new entity Customer
may form (e.g. a spin-out, sister company, or successor entity).
A new entity must contract with Provider on then-current terms.

---

## 6. No additional fees

Provider commits, for the duration of this letter:

- No mandatory implementation fees, training fees, or
  professional-services fees for use of standard features
- No price increases for AI usage within reasonable limits as
  defined in the ToS
- No reduction in features included in the €99/month rate

Reasonable limits exist (Provider is not obligated to absorb
unbounded usage costs). If Customer's usage materially exceeds
those limits, Provider will discuss in good faith before any fee
is charged.

---

## 7. Conflict with other documents

Where this letter conflicts with the standard ToS or pricing page,
this letter prevails for Customer specifically. The DPA is
unaffected by this letter and remains binding on both parties.

---

## 8. Signatures

Signed in two original copies, one retained by each party.

For Customer:

Name: ______________________________

Title: ______________________________

Signature: ______________________________

Date: ______________________________

For Provider (Juan Diaz LLC):

Name: Juan Stefan Diaz

Title: Founder

Signature: ______________________________

Date: ______________________________

---

## Operator-internal checklist (NOT part of signed document)

Voor je dit ondertekent met klant #1 — werk deze lijst af:

- [ ] **Legal entity gefinaliseerd:** "Juan Diaz LLC" wordt nu
      gebruikt — verifieer of dit een echte US LLC is of de naam
      van een NL-BV. Vul KvK-nummer + zakelijk adres in op regel
      1 van dit document.
- [ ] **Lawyer-review:** laat een NL-bedrijfsjurist 30 min
      doorlopen. Specifiek vragen: (1) is "lifetime" afdwingbaar
      onder NL recht, (2) is sectie 5 sluitend tegen acquisitie-
      arbitrage, (3) is sectie 6 niet onbedoeld een blanco-cheque?
      Verwacht ~€150-300 review-kosten.
- [ ] **DPA-versie referentie:** noteer welke DPA-versie bij
      ondertekening geldt. Als jij DPA later update, blijft
      klant op oude tot ze nieuwe tekenen.
- [ ] **Storage:** scan ondertekend exemplaar als PDF, upload naar
      Supabase storage bucket `side-letters/`. Audit-log een
      `legal.side_letter_signed`-rij.
- [ ] **Klant-zichtbaarheid:** voeg "Side letter on file" toe
      aan `/philly/settings/billing` voor deze klant zodat ze hun
      lock kunnen verifiëren.
- [ ] **Internal record:** noteer in `MANUAL_TASKS.md` en
      memory dat klant #N op locked €99 zit. Bij elke pricing-
      review later die info raadplegen.

---

## Versie-historie

| Versie | Datum | Auteur | Wijziging |
|---|---|---|---|
| 0.1 | 2026-05-08 | Juan / Claude | Initial draft |
