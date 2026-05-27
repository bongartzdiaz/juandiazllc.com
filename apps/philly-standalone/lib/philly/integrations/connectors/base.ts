/* Abstract connector contract. Concrete connectors implement subsets. */

export interface OAuthSpec {
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  /**
   * OAuth grant type. Defaults to authorization_code (user-facing redirect
   * flow). Use client_credentials for server-to-server portal partners
   * like Funda where there's no end-user authorization step.
   */
  grantType?: 'authorization_code' | 'client_credentials'
}

export interface ConnectorMetadata {
  id: string
  name: string
  /**
   * `portal` category added 2026-05-27 for EU real-estate publishing
   * integrations (Funda, ImmoScout24, Immoweb, Idealista, SeLoger).
   * These connectors implement `PortalPublisher` (below) in addition
   * to the credential test() contract.
   */
  category: 'payments' | 'communication' | 'calendar' | 'accounting' | 'marketing' | 'productivity' | 'portal'
  oauth?: OAuthSpec
  /** Whether this connector uses static API keys vs OAuth */
  apiKey?: boolean
  /**
   * Optional country restriction. Portal connectors are region-specific
   * (Funda = NL, ImmoScout24 = DE, Idealista = ES, SeLoger = FR,
   * Immoweb = BE). UI filters by org country so operators only see
   * relevant connectors.
   */
  countries?: readonly string[]
}

export interface TestResult {
  ok: boolean
  error?: string
  info?: Record<string, unknown>
}

export abstract class BaseConnector {
  abstract meta: ConnectorMetadata
  abstract test(credentials: { accessToken?: string; apiKey?: string; metadata?: Record<string, unknown> }): Promise<TestResult>
}

/**
 * Optional secondary interface for connectors that publish Property
 * listings to a real-estate portal AND receive lead webhooks back.
 *
 * Implemented by Funda, ImmoScout24, Immoweb adapters. Each method is
 * `unknown`-typed at the base level so concrete adapters can narrow to
 * their portal-specific payload shapes without overloading this contract.
 *
 * The DEUS Property model maps to one or more `PortalListing` rows
 * (planned schema model, separate PR). Each row carries (portal,
 * externalId) so dedupe on re-publish is trivial.
 */
export interface PortalPublisher {
  /**
   * Validate that a Property is publishable on this portal. Returns
   * ok+listing-id-stub on success, ok=false with a localised error
   * code on rejection (e.g. missing EPC, no photos, invalid postal
   * code). Pure-ish — no portal API call, just shape validation.
   * Used by /api/properties/[id]/publish dryrun flow.
   */
  validate(input: unknown): Promise<{ ok: true } | { ok: false; code: string; message: string }>

  /**
   * Actually publish the Property to the portal. Idempotent on
   * (organizationId, propertyId, portal) — re-publishing the same
   * property updates the existing listing instead of creating a
   * duplicate. Returns the portal's external listing id.
   */
  publish(input: unknown): Promise<{ ok: true; externalId: string; externalUrl?: string } | { ok: false; code: string; message: string }>

  /** Remove a listing from the portal. Idempotent — calling on an
   *  already-unpublished listing is a no-op success. */
  unpublish(externalId: string): Promise<{ ok: true } | { ok: false; code: string; message: string }>

  /**
   * Poll for inbound leads since the given cursor. Most portals also
   * push leads via webhook (see app/api/webhooks/funda/route.ts), but
   * this poll-based fallback lets the operator backfill if a webhook
   * delivery was missed.
   */
  fetchLeads(since: Date): Promise<{ ok: true; leads: unknown[]; nextCursor?: Date } | { ok: false; code: string; message: string }>
}
