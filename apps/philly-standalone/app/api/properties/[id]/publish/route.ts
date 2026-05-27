/* POST   /api/properties/[id]/publish      — publish to portal
   DELETE /api/properties/[id]/publish      — unpublish from portal
   ──────────────────────────────────────────────────────────────────
   Body shape for POST:
     { portal: 'funda' | 'immoscout24', dryRun?: boolean }
       - dryRun: true → only run validate(), don't call the portal API
                       or write a PortalListing row. Used by the
                       "Publishable?" badge in the property list.

   Body shape for DELETE:
     { portal: 'funda' | 'immoscout24' }

   Response shape (POST):
     {
       data: {
         ok: boolean
         externalId?: string        // present when ok=true
         externalUrl?: string
         code?: string              // localised code on failure (FUNDA_EPC_REQUIRED, ...)
         message?: string           // human-readable, server-side (UI re-translates code)
         portalListing?: {          // present when ok=true and !dryRun
           id: string
           status: string
           lastSyncAt: string
         }
       }
     }

   Flow (POST):
     1. requireSection('properties', ['admin','manager'])  — same gate as PATCH
     2. enforceRateLimit (per-org)
     3. Resolve portal connector from registry; reject unknown portal
     4. Load Property + assert org ownership
     5. Build DeusPropertyForFunda/IS24 from the Property row
     6. Call connector.validate(deusProp) — fast-fail on missing EPC etc.
     7. If dryRun → return validation result
     8. Call connector.publish(deusProp) — fails if credentials missing
     9. Upsert PortalListing row on (organizationId, propertyId, portal)
    10. Audit log + return shape

   Flow (DELETE):
     1. Same auth + rate-limit
     2. Find PortalListing row by (org, property, portal)
     3. Call connector.unpublish(externalId)
     4. Delete PortalListing row
     5. Audit log
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { getConnector } from '@/lib/philly/integrations/registry'
import type { PortalPublisher } from '@/lib/philly/integrations/connectors/base'
import type { DeusPropertyForFunda } from '@/lib/philly/integrations/funda/types'
import type { DeusPropertyForIS24 } from '@/lib/philly/integrations/immoscout24/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const PORTAL_IDS = ['funda', 'immoscout24'] as const
type PortalId = (typeof PORTAL_IDS)[number]

const PublishBody = z.object({
  portal: z.enum(PORTAL_IDS),
  dryRun: z.boolean().optional().default(false),
})

const UnpublishBody = z.object({
  portal: z.enum(PORTAL_IDS),
})

/** ─── Property → portal-adapter input shape ─── */
//
// Both Funda and IS24 want a similar superset of fields, so we build
// one shape and let TypeScript narrow per portal. The only branch is
// the optional `energyCertificateType` which is IS24-specific.
function buildAdapterInput(property: {
  id: string
  organizationId: string
  listingType: string
  priceCents: number
  address: string
  city: string
  zipCode: string
  country: string
  subtype: string
  livingArea?: number | null
  lotSqft?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  yearBuilt?: number | null
  epcRating?: string | null
  epcExpiresAt?: Date | null
  description: string
  images: string  // JSON string
  virtualTourUrl?: string
}): DeusPropertyForFunda & DeusPropertyForIS24 {
  // Property.images is stored as a JSON-string column — parse defensively.
  let images: string[] = []
  try {
    const parsed = JSON.parse(property.images || '[]')
    if (Array.isArray(parsed)) images = parsed.filter(x => typeof x === 'string')
  } catch { /* malformed → empty */ }

  return {
    id: property.id,
    organizationId: property.organizationId,
    // DEUS stores 'sale' | 'rent' — both adapters accept this.
    listingType: property.listingType === 'rent' ? 'rent' : 'sale',
    priceCents: property.priceCents,
    address: property.address,
    city: property.city,
    zipCode: property.zipCode,
    country: property.country,
    subtype: property.subtype,
    // Property.livingArea is stored as m² in EU; Property.lotSqft is sqft
    // (US legacy) — for now we don't bridge units here, the operator UI
    // sets m² for EU rows. TODO: introduce explicit lotAreaSqm column.
    livingAreaSqm: property.livingArea ?? undefined,
    lotAreaSqm: undefined,
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? null,
    numberOfRooms: null,
    yearBuilt: property.yearBuilt ?? null,
    epcRating: property.epcRating ?? null,
    epcExpiresAt: property.epcExpiresAt ?? null,
    description: property.description,
    images,
    virtualTourUrl: property.virtualTourUrl ?? undefined,
  }
}

function isPortalPublisher(c: unknown): c is PortalPublisher {
  return typeof c === 'object' && c !== null
    && typeof (c as PortalPublisher).publish === 'function'
    && typeof (c as PortalPublisher).validate === 'function'
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('properties', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`portal.publish:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const parsed = PublishBody.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid body', 400)
  }
  const { portal, dryRun } = parsed.data
  const { id: propertyId } = await ctx.params

  const connector = getConnector(portal)
  if (!connector || !isPortalPublisher(connector)) {
    return jsonError(`Portal "${portal}" is not a publisher`, 400)
  }

  const prisma = getAuthPrisma()
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organizationId: scope.organizationId },
  })
  if (!property) return jsonError('Property not found', 404)

  const adapterInput = buildAdapterInput(property as Parameters<typeof buildAdapterInput>[0])

  if (dryRun) {
    const v = await connector.validate(adapterInput)
    if (v.ok) return NextResponse.json({ data: { ok: true } })
    return NextResponse.json({ data: { ok: false, code: v.code, message: v.message } })
  }

  const result = await connector.publish(adapterInput)
  if (!result.ok) {
    // Persist the failure on a PortalListing row in `draft` status so the
    // operator's UI shows the last error. Don't fail the request — the
    // operator wants the error code to fix it.
    await prisma.portalListing.upsert({
      where: { organizationId_propertyId_portal: { organizationId: scope.organizationId, propertyId, portal } },
      create: {
        organizationId: scope.organizationId,
        propertyId,
        portal,
        externalId: '',
        status: 'draft',
        lastError: `${result.code}: ${result.message}`,
      },
      update: {
        status: 'draft',
        lastError: `${result.code}: ${result.message}`,
      },
    })
    return NextResponse.json({ data: { ok: false, code: result.code, message: result.message } })
  }

  // Success → upsert PortalListing row.
  const portalListing = await prisma.portalListing.upsert({
    where: { organizationId_propertyId_portal: { organizationId: scope.organizationId, propertyId, portal } },
    create: {
      organizationId: scope.organizationId,
      propertyId,
      portal,
      externalId: result.externalId,
      externalUrl: result.externalUrl ?? null,
      status: 'published',
      lastSyncAt: new Date(),
      lastError: null,
    },
    update: {
      externalId: result.externalId,
      externalUrl: result.externalUrl ?? null,
      status: 'published',
      lastSyncAt: new Date(),
      lastError: null,
    },
  })

  await logAudit({
    scope,
    action: 'create',  // 'create' for a new portal-listing row (or update if it existed)
    entity: 'property',
    entityId: propertyId,
    changes: {
      portalPublished: { old: null, new: { portal, externalId: result.externalId } },
    },
  })

  return NextResponse.json({
    data: {
      ok: true,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      portalListing: {
        id: portalListing.id,
        status: portalListing.status,
        lastSyncAt: portalListing.lastSyncAt?.toISOString() ?? null,
      },
    },
  })
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('properties', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`portal.unpublish:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  const parsed = UnpublishBody.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid body', 400)
  const { portal } = parsed.data
  const { id: propertyId } = await ctx.params

  const connector = getConnector(portal)
  if (!connector || !isPortalPublisher(connector)) {
    return jsonError(`Portal "${portal}" is not a publisher`, 400)
  }

  const prisma = getAuthPrisma()
  const listing = await prisma.portalListing.findUnique({
    where: { organizationId_propertyId_portal: { organizationId: scope.organizationId, propertyId, portal } },
  })
  if (!listing || !listing.externalId) {
    // Nothing to unpublish — treat as success (idempotent).
    return NextResponse.json({ data: { ok: true } })
  }

  const result = await connector.unpublish(listing.externalId)
  if (!result.ok) {
    return NextResponse.json({ data: { ok: false, code: result.code, message: result.message } }, { status: 502 })
  }

  await prisma.portalListing.delete({
    where: { organizationId_propertyId_portal: { organizationId: scope.organizationId, propertyId, portal } },
  })

  await logAudit({
    scope,
    action: 'delete',
    entity: 'property',
    entityId: propertyId,
    changes: {
      portalUnpublished: { old: { portal, externalId: listing.externalId }, new: null },
    },
  })

  return NextResponse.json({ data: { ok: true } })
}
