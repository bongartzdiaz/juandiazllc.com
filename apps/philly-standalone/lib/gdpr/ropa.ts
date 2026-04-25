/* ---------------------------------------------------------------
   Records of Processing Activities (RoPA) — GDPR Art. 30
   ---------------------------------------------------------------
   Article 30 requires every controller to maintain a register of
   processing activities. We keep ours as code so it is reviewed in
   PRs alongside the implementation, and so any drift between policy
   and reality surfaces in code review.

   This file is the canonical RoPA. The /admin/gdpr page renders it
   for human review; the /api/admin/gdpr/ropa endpoint serializes it
   for export to a regulator on request.
   --------------------------------------------------------------- */

import type { LawfulBasis } from './pii-registry'

export interface ProcessingActivity {
  /** Stable identifier — used in GdprConsentRecord.purpose. */
  id: string
  /** Short human-readable name. */
  name: string
  /** Plain-English description of what we do with the data. */
  description: string
  /** Categories of data subject (Art. 30(1)(c)). */
  dataSubjects: string[]
  /** Categories of personal data (Art. 30(1)(c)). */
  dataCategories: string[]
  lawfulBasis: LawfulBasis
  /** Recipients of the data (Art. 30(1)(d)). */
  recipients: string[]
  /** Whether data is transferred outside the EEA (Art. 30(1)(e)). */
  thirdCountryTransfers: Array<{
    country: string
    safeguard: 'adequacy' | 'scc' | 'bcr' | 'derogation'
    notes?: string
  }>
  /** Retention period — should match lib/gdpr/pii-registry.ts. */
  retentionPolicy: string
  /** Technical & organisational security measures (Art. 30(1)(g)). */
  securityMeasures: string[]
}

export const PROCESSING_ACTIVITIES: ReadonlyArray<ProcessingActivity> = [
  {
    id: 'operator_authentication',
    name: 'CRM operator authentication',
    description:
      'Authenticate employees of the controller into the CRM. Email + password (hashed via Supabase) + optional TOTP 2FA.',
    dataSubjects: ['Employees of the controller'],
    dataCategories: ['Email', 'Display name', 'Hashed password', 'TOTP secret (encrypted)', 'IP address (last login)'],
    lawfulBasis: 'contract',
    recipients: ['Supabase (auth provider, EU region)'],
    thirdCountryTransfers: [],
    retentionPolicy: 'Retained for the duration of employment + 7 years (employment-record retention).',
    securityMeasures: [
      'Passwords hashed via bcrypt at the auth provider',
      'TOTP secrets encrypted at rest via lib/philly/crypto.ts',
      'Account lockout after 10 failed login attempts',
      'TLS 1.2+ in transit',
    ],
  },
  {
    id: 'contact_management',
    name: 'Business-relationship management',
    description:
      'Store contact details of leads, donors, partners, and stakeholders to coordinate business activities.',
    dataSubjects: ['Leads', 'Donors', 'Partners', 'Stakeholders', 'Beneficiaries'],
    dataCategories: ['Name', 'Email', 'Phone', 'Company', 'Free-text notes'],
    lawfulBasis: 'legitimate_interest',
    recipients: ['Internal CRM operators only'],
    thirdCountryTransfers: [],
    retentionPolicy: 'Retained for 3 years after last interaction; auto-purged thereafter.',
    securityMeasures: [
      'Per-organisation tenancy isolation (organizationId scoping on every query)',
      'Role-based access control (admin / manager / viewer)',
      'Per-section access allow-list (User.dashboardSections)',
      'Append-only AuditLog for all create/update/delete actions',
    ],
  },
  {
    id: 'hospitality_reservations',
    name: 'Hospitality bookings',
    description: 'Manage room reservations and guest stays in the hospitality vertical.',
    dataSubjects: ['Hospitality guests'],
    dataCategories: ['Guest name', 'Guest email', 'Guest phone', 'Stay dates', 'Notes'],
    lawfulBasis: 'contract',
    recipients: ['Internal CRM operators only'],
    thirdCountryTransfers: [],
    retentionPolicy: 'Retained for 5 years (typical hospitality / fiscal retention).',
    securityMeasures: [
      'Per-organisation tenancy isolation via Room → Organization',
      'Append-only AuditLog',
    ],
  },
  {
    id: 'volunteer_roster',
    name: 'Volunteer programme administration',
    description: 'Coordinate participation of volunteers in programmes operated by the controller.',
    dataSubjects: ['Volunteers'],
    dataCategories: ['Name', 'Email', 'Phone', 'Skills', 'Availability'],
    lawfulBasis: 'consent',
    recipients: ['Internal CRM operators only'],
    thirdCountryTransfers: [],
    retentionPolicy:
      'Retained for 2 years after last activity. Volunteers may withdraw consent at any time, triggering immediate erasure.',
    securityMeasures: [
      'Consent recorded in GdprConsentRecord (proof-of-consent under Art. 7)',
      'Per-organisation tenancy isolation',
    ],
  },
  {
    id: 'open_house_visits',
    name: 'Open-house visitor capture',
    description: 'Record interest from visitors to real-estate open houses for follow-up.',
    dataSubjects: ['Open-house visitors'],
    dataCategories: ['Name (optional)', 'Email (optional)', 'Phone (optional)', 'Pre-approval status'],
    lawfulBasis: 'consent',
    recipients: ['Internal CRM operators only'],
    thirdCountryTransfers: [],
    retentionPolicy: 'Retained for 1 year (cold-lead data).',
    securityMeasures: ['Per-organisation tenancy isolation via OpenHouse → Property → Organization'],
  },
  {
    id: 'inbound_outbound_messaging',
    name: 'Email & SMS correspondence',
    description: 'Two-way email and SMS communication with contacts, retained for business continuity.',
    dataSubjects: ['Leads', 'Donors', 'Partners', 'Stakeholders'],
    dataCategories: ['Email addresses', 'Phone numbers', 'Message bodies'],
    lawfulBasis: 'legitimate_interest',
    recipients: [
      'Email provider (configurable per Integration row, e.g. Gmail / Microsoft 365)',
      'SMS provider (Twilio / equivalent)',
    ],
    thirdCountryTransfers: [
      {
        country: 'United States',
        safeguard: 'scc',
        notes:
          'Twilio operates Standard Contractual Clauses for EU→US transfers. Verify per integration before enabling.',
      },
    ],
    retentionPolicy: 'Retained for 3 years; auto-purged thereafter.',
    securityMeasures: [
      'Provider tokens stored as @db.Text and rotated annually',
      'Append-only AuditLog records',
    ],
  },
  {
    id: 'electronic_signatures',
    name: 'Electronic signatures on contracts',
    description: 'Capture e-signatures on contracts to evidence consent to terms.',
    dataSubjects: ['Contract counterparties'],
    dataCategories: ['Signer name', 'Signer email', 'Signature timestamp'],
    lawfulBasis: 'contract',
    recipients: ['DocuSign / HelloSign / PandaDoc (configurable per Integration)'],
    thirdCountryTransfers: [
      {
        country: 'United States',
        safeguard: 'scc',
        notes: 'DocuSign and HelloSign operate Standard Contractual Clauses for EU→US transfers.',
      },
    ],
    retentionPolicy: 'Retained for 10 years (contract evidentiary period under most EU jurisdictions).',
    securityMeasures: ['Provider-managed encryption at rest', 'Per-organisation tenancy via Transaction'],
  },
  {
    id: 'security_audit_log',
    name: 'Security & compliance audit log',
    description:
      'Append-only record of who-did-what for forensic investigation, breach response, and compliance verification.',
    dataSubjects: ['CRM operators'],
    dataCategories: ['User ID', 'Action', 'Entity affected', 'Field-level diff'],
    lawfulBasis: 'legal_obligation',
    recipients: ['Internal compliance review only'],
    thirdCountryTransfers: [],
    retentionPolicy: 'Retained for 1 year then auto-purged by lib/gdpr/retention.ts.',
    securityMeasures: [
      'Append-only by API contract (no DELETE handler exposed)',
      'Indexed by (organizationId, createdAt) and (entity, entityId) for forensic queries',
    ],
  },
  {
    id: 'gdpr_proof_of_erasure',
    name: 'Proof-of-erasure register',
    description:
      'Maintain a hash-only register of every erasure performed, so we can demonstrate Art. 17 compliance to a regulator without retaining the data subject\'s identifying information.',
    dataSubjects: ['Anyone whose data has been erased'],
    dataCategories: ['SHA-256 hash of email', 'Erasure channel', 'Per-model row counts'],
    lawfulBasis: 'legal_obligation',
    recipients: ['Internal compliance review and regulators upon request'],
    thirdCountryTransfers: [],
    retentionPolicy:
      'Retained indefinitely — the hash is pseudonymous after the underlying records are erased, and the proof must outlive any potential regulator inquiry.',
    securityMeasures: [
      'Plaintext email never written to GdprErasureLog (SHA-256 hashing in lib/gdpr/hash.ts)',
      'Append-only by API contract',
    ],
  },
] as const

export function findActivity(id: string): ProcessingActivity | undefined {
  return PROCESSING_ACTIVITIES.find((a) => a.id === id)
}
