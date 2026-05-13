/* ---------------------------------------------------------------
   PII Registry — single source of truth for GDPR compliance
   ---------------------------------------------------------------
   Every Prisma model that holds personal data is enumerated here
   with: which fields are PII, the lawful basis (Art. 6 GDPR), the
   processing purpose, and the retention period.

   Three downstream consumers read from this registry:
   - lib/gdpr/export.ts         → Subject Access Request (Art. 15)
   - lib/gdpr/ropa.ts           → Records of Processing Activities (Art. 30)
   - lib/gdpr/retention.ts      → automated purge of stale rows

   When you add a new Prisma model with PII, you MUST add an entry
   here. The typecheck-time `assertRegistryShape()` keeps drift in
   check by failing the build if a known model is missing.
   --------------------------------------------------------------- */

/**
 * Lawful basis for processing under GDPR Art. 6(1).
 * - contract: Art. 6(1)(b) — necessary for performance of a contract
 * - legitimate_interest: Art. 6(1)(f) — controller's legitimate interest
 * - consent: Art. 6(1)(a) — explicit consent
 * - legal_obligation: Art. 6(1)(c) — legal obligation (e.g. tax retention)
 * - vital_interest: Art. 6(1)(d) — vital interests of data subject
 * - public_task: Art. 6(1)(e) — public-interest / official authority
 */
export type LawfulBasis =
  | 'contract'
  | 'legitimate_interest'
  | 'consent'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'

/**
 * Sensitivity tier — informs default retention & access controls.
 * - basic: name, company, role
 * - contact: email, phone, address
 * - identifier: government ID, IP address, device fingerprint
 * - financial: bank, transaction, payment
 * - special: Art. 9 GDPR — health, racial origin, etc. (do not store
 *   without explicit Art. 9(2) basis + DPIA)
 */
export type Sensitivity = 'basic' | 'contact' | 'identifier' | 'financial' | 'special'

export interface PiiField {
  /** Prisma field name. */
  name: string
  /** Human-readable description for SAR exports + privacy notice. */
  description: string
  sensitivity: Sensitivity
  /** True if the field is encrypted at rest (column-level or app-layer). */
  encrypted?: boolean
}

export interface PiiModel {
  /** Prisma model name (PascalCase). */
  model: string
  /**
   * Who is the data subject for rows in this model?
   * - operator: a CRM user (employee of the controller)
   * - contact:  a third party stored as a CRM record
   *   (lead, donor, volunteer, guest, tenant, etc.)
   */
  subject: 'operator' | 'contact'
  lawfulBasis: LawfulBasis
  /** Plain-English purpose, suitable for the privacy notice. */
  purpose: string
  /** Retention period in days from the row's createdAt or last touch. */
  retentionDays: number
  /**
   * Field-name on the row used to find rows belonging to a given email.
   * Used by SAR export + admin-led erasure to look up data subjects.
   * `null` = not directly identifiable (rows are erased via cascade).
   */
  emailField: string | null
  /**
   * Field-name pointing to the operator-User who owns the row,
   * for self-export of operator data. `null` = not operator-scoped.
   */
  ownerField: string | null
  fields: PiiField[]
}

/**
 * The registry. Order is preserved when SAR exports iterate.
 *
 * NOTE: This list is the authoritative inventory. If you add a new
 * Prisma model with a column that holds personal data, add it here
 * in the same PR — otherwise SAR exports will be incomplete and you
 * are out of compliance with Art. 15.
 */
export const PII_REGISTRY: ReadonlyArray<PiiModel> = [
  {
    model: 'User',
    subject: 'operator',
    lawfulBasis: 'contract',
    purpose: 'Authenticate and authorize CRM operators (employees of the controller).',
    retentionDays: 365 * 7, // 7 years — matches typical employment-record retention
    emailField: 'email',
    ownerField: 'id',
    fields: [
      { name: 'email', description: 'Login email', sensitivity: 'contact' },
      { name: 'name', description: 'Display name', sensitivity: 'basic' },
      { name: 'avatarUrl', description: 'Profile picture URL', sensitivity: 'basic' },
      { name: 'lastLoginIp', description: 'IP address of last sign-in', sensitivity: 'identifier' },
      {
        name: 'twoFactorSecret',
        description: 'TOTP shared secret (encrypted)',
        sensitivity: 'identifier',
        encrypted: true,
      },
      { name: 'locale', description: 'Preferred UI language', sensitivity: 'basic' },
    ],
  },
  {
    model: 'Contact',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'Maintain a record of business relationships (leads, donors, partners, stakeholders).',
    retentionDays: 365 * 3, // 3 years after last contact
    emailField: 'email',
    ownerField: null,
    fields: [
      { name: 'name', description: 'Full name', sensitivity: 'basic' },
      { name: 'email', description: 'Contact email (AES-256-GCM at rest, blind-index for search)', sensitivity: 'contact', encrypted: true },
      { name: 'phone', description: 'Contact phone (AES-256-GCM at rest, blind-index for search)', sensitivity: 'contact', encrypted: true },
      { name: 'company', description: 'Employer / organization', sensitivity: 'basic' },
      { name: 'notes', description: 'Free-text notes (AES-256-GCM at rest)', sensitivity: 'contact', encrypted: true },
    ],
  },
  {
    model: 'ContactNote',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'Operator-authored notes attached to a contact for business follow-up.',
    retentionDays: 365 * 3,
    emailField: null,
    ownerField: 'userId',
    fields: [{ name: 'content', description: 'Note body (AES-256-GCM at rest)', sensitivity: 'contact', encrypted: true }],
  },
  {
    model: 'Activity',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'Audit trail of operator actions on contacts/projects (call made, email sent, etc.).',
    retentionDays: 365 * 2,
    emailField: null,
    ownerField: 'userId',
    fields: [{ name: 'description', description: 'Activity description', sensitivity: 'basic' }],
  },
  {
    model: 'Reservation',
    subject: 'contact',
    lawfulBasis: 'contract',
    purpose: 'Hospitality bookings — guest data needed to fulfill the reservation contract.',
    retentionDays: 365 * 5, // 5 years — typical hospitality / fiscal retention
    emailField: 'guestEmail',
    ownerField: null,
    fields: [
      { name: 'guestName', description: 'Guest name', sensitivity: 'basic' },
      { name: 'guestEmail', description: 'Guest email', sensitivity: 'contact' },
      { name: 'guestPhone', description: 'Guest phone', sensitivity: 'contact' },
    ],
  },
  {
    model: 'Volunteer',
    subject: 'contact',
    lawfulBasis: 'consent',
    purpose: 'Volunteer roster — name + contact details to coordinate program participation.',
    retentionDays: 365 * 2,
    emailField: 'email',
    ownerField: null,
    fields: [
      { name: 'name', description: 'Volunteer name', sensitivity: 'basic' },
      { name: 'email', description: 'Volunteer email', sensitivity: 'contact' },
      { name: 'phone', description: 'Volunteer phone', sensitivity: 'contact' },
    ],
  },
  {
    model: 'OpenHouseVisit',
    subject: 'contact',
    lawfulBasis: 'consent',
    purpose: 'Capture interest from open-house visitors (real-estate vertical).',
    retentionDays: 365, // 1 year — short, since these are cold leads
    emailField: 'email',
    ownerField: null,
    fields: [
      { name: 'name', description: 'Visitor name (optional)', sensitivity: 'basic' },
      { name: 'email', description: 'Visitor email (optional)', sensitivity: 'contact' },
      { name: 'phone', description: 'Visitor phone (optional)', sensitivity: 'contact' },
    ],
  },
  {
    model: 'Message',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'Email correspondence with contacts, retained for business continuity.',
    retentionDays: 365 * 3,
    emailField: 'fromAddress',
    ownerField: null,
    fields: [
      { name: 'fromAddress', description: 'Sender email', sensitivity: 'contact' },
      { name: 'toAddress', description: 'Recipient email', sensitivity: 'contact' },
      { name: 'body', description: 'Message body (plain text)', sensitivity: 'contact' },
      { name: 'bodyHtml', description: 'Message body (HTML)', sensitivity: 'contact' },
    ],
  },
  {
    model: 'ESignature',
    subject: 'contact',
    lawfulBasis: 'contract',
    purpose: 'Electronic signatures on contracts — needed for contract enforceability.',
    retentionDays: 365 * 10, // 10 years — contract evidentiary period
    emailField: 'signerEmail',
    ownerField: null,
    fields: [
      { name: 'signerName', description: 'Signer full name', sensitivity: 'basic' },
      { name: 'signerEmail', description: 'Signer email', sensitivity: 'contact' },
    ],
  },
  {
    model: 'CallLog',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'Outbound/inbound call records — number dialed, duration, and outcome notes.',
    retentionDays: 365 * 2,
    emailField: null,
    ownerField: null,
    fields: [
      { name: 'phoneNumber', description: 'Phone number', sensitivity: 'contact' },
      { name: 'notes', description: 'Call outcome notes', sensitivity: 'contact' },
    ],
  },
  {
    model: 'SmsMessage',
    subject: 'contact',
    lawfulBasis: 'legitimate_interest',
    purpose: 'SMS conversation history with contacts, retained for business continuity.',
    retentionDays: 365 * 2,
    emailField: null,
    ownerField: null,
    fields: [
      { name: 'fromNumber', description: 'Sender phone number', sensitivity: 'contact' },
      { name: 'toNumber', description: 'Recipient phone number', sensitivity: 'contact' },
      { name: 'body', description: 'SMS body', sensitivity: 'contact' },
    ],
  },
  {
    model: 'AuditLog',
    subject: 'operator',
    lawfulBasis: 'legal_obligation',
    purpose: 'Tamper-evident record of who-did-what for security & compliance forensics.',
    retentionDays: 365, // 1 year — auto-purged by lib/gdpr/retention.ts
    emailField: null,
    ownerField: 'userId',
    fields: [
      { name: 'action', description: 'Action performed', sensitivity: 'basic' },
      { name: 'entity', description: 'Entity type', sensitivity: 'basic' },
      { name: 'entityId', description: 'Entity ID', sensitivity: 'basic' },
      { name: 'changes', description: 'Field-level diff (JSON)', sensitivity: 'basic' },
    ],
  },
  {
    // Bundle DJ — billing-record retention. Subscription mirrors
    // Stripe's view of the org's plan + status; it's a financial
    // record under NL fiscal-bookkeeping obligation (Wet IB / Awb
    // requires 7 years for VAT-relevant records). Not in
    // MODEL_TO_CLIENT in lib/gdpr/retention.ts intentionally — Stripe
    // is the source of truth and we don't auto-prune on a 7-year
    // cycle; the row CASCADE-deletes with the Organization when the
    // tenant is erased, which handles the Art. 17 path. This entry
    // exists so the RoPA + privacy notice surface the policy.
    model: 'Subscription',
    subject: 'operator',
    lawfulBasis: 'legal_obligation',
    purpose:
      'Billing-record mirror of the org’s Stripe subscription state — plan, status, period dates. Required for VAT bookkeeping (NL Wet IB art. 52, 7-year retention) and dispute resolution. Source of truth lives in Stripe.',
    retentionDays: 2557, // 7 years from createdAt (NL fiscal record-keeping)
    emailField: null,
    ownerField: null,
    fields: [
      { name: 'stripeCustomerId', description: 'Stripe Customer ID — pseudonymous, links to org billing in Stripe Dashboard', sensitivity: 'basic' },
      { name: 'stripeSubscriptionId', description: 'Stripe Subscription ID — opaque billing-record identifier', sensitivity: 'basic' },
      { name: 'plan', description: 'Selected plan slug (operator/team/business)', sensitivity: 'basic' },
      { name: 'status', description: 'Subscription status (active/trialing/canceled/etc.)', sensitivity: 'basic' },
      { name: 'currentPeriodStart', description: 'Current billing cycle start', sensitivity: 'basic' },
      { name: 'currentPeriodEnd', description: 'Current billing cycle end', sensitivity: 'basic' },
      { name: 'trialEndsAt', description: 'Trial expiration timestamp', sensitivity: 'basic' },
    ],
  },
] as const

/**
 * Look up registry entries by data-subject category.
 * - operator: CRM users → self-service export/erasure paths
 * - contact:  third parties → admin-led DSAR path
 */
export function modelsForSubject(subject: 'operator' | 'contact'): ReadonlyArray<PiiModel> {
  return PII_REGISTRY.filter((m) => m.subject === subject)
}

/**
 * All models that can be looked up by an email address. Used by the
 * admin-led data-subject export/erasure to enumerate where to search.
 */
export function modelsLookupByEmail(): ReadonlyArray<PiiModel> {
  return PII_REGISTRY.filter((m) => m.emailField !== null)
}

/**
 * All models that can be looked up by an operator's User.id. Used by
 * the self-service export to enumerate operator-scoped rows.
 */
export function modelsLookupByOwner(): ReadonlyArray<PiiModel> {
  return PII_REGISTRY.filter((m) => m.ownerField !== null)
}
