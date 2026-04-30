/* GET  /api/properties/taxonomy — fetch per-org property taxonomy (auto-seeds with Cyprus defaults)
   PUT  /api/properties/taxonomy — replace full taxonomy (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import {
  CYPRUS_DISTRICTS,
  LISTING_TYPES,
  PROPERTY_TYPES,
  PROPERTY_SUBTYPES,
} from '@/lib/philly/constants/cyprus-property'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Option = { value: string; label: string }

function defaultTaxonomy() {
  return {
    countryLabel: 'Cyprus',
    districts: CYPRUS_DISTRICTS.filter(d => d.value).map(d => ({ value: d.value, label: d.label })),
    propertyTypes: PROPERTY_TYPES.map(t => ({ value: t.value, label: t.label })),
    subtypes: Object.fromEntries(
      Object.entries(PROPERTY_SUBTYPES).map(([k, arr]) => [k, arr.filter(s => s.value).map(s => ({ value: s.value, label: s.label }))])
    ),
    listingTypes: LISTING_TYPES.map(l => ({ value: l.value, label: l.label })),
    flags: [
      { key: 'isBankOwned', label: 'Bank Owned Properties' },
      { key: 'isResale', label: 'Resale Properties' },
    ],
  }
}

function parseTaxonomy(row: any) {
  const safeJSON = (s: string, fallback: any) => { try { return JSON.parse(s) } catch { return fallback } }
  return {
    id: row.id,
    countryLabel: row.countryLabel,
    districts: safeJSON(row.districts, []) as Option[],
    propertyTypes: safeJSON(row.propertyTypes, []) as Option[],
    subtypes: safeJSON(row.subtypes, {}) as Record<string, Option[]>,
    listingTypes: safeJSON(row.listingTypes, []) as Option[],
    flags: safeJSON(row.flags, []) as Array<{ key: string; label: string }>,
    updatedAt: row.updatedAt,
  }
}

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  let row = await prisma.propertyTaxonomy.findUnique({
    where: { organizationId: scope.organizationId },
  })

  if (!row) {
    const def = defaultTaxonomy()
    row = await prisma.propertyTaxonomy.create({
      data: {
        organizationId: scope.organizationId,
        countryLabel: def.countryLabel,
        districts: JSON.stringify(def.districts),
        propertyTypes: JSON.stringify(def.propertyTypes),
        subtypes: JSON.stringify(def.subtypes),
        listingTypes: JSON.stringify(def.listingTypes),
        flags: JSON.stringify(def.flags),
      },
    })
  }

  return NextResponse.json({ data: parseTaxonomy(row) })
}

export async function PUT(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`properties.taxonomy.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: any
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  // Validate shape minimally
  const validateOptArr = (v: any) => Array.isArray(v) && v.every(o => typeof o?.value === 'string' && typeof o?.label === 'string')
  if (body.districts && !validateOptArr(body.districts)) return jsonError('districts must be array of {value,label}', 400)
  if (body.propertyTypes && !validateOptArr(body.propertyTypes)) return jsonError('propertyTypes must be array of {value,label}', 400)
  if (body.listingTypes && !validateOptArr(body.listingTypes)) return jsonError('listingTypes must be array of {value,label}', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.propertyTaxonomy.findUnique({
    where: { organizationId: scope.organizationId },
  })

  const data: any = {
    ...(body.countryLabel != null ? { countryLabel: String(body.countryLabel) } : {}),
    ...(body.districts ? { districts: JSON.stringify(body.districts) } : {}),
    ...(body.propertyTypes ? { propertyTypes: JSON.stringify(body.propertyTypes) } : {}),
    ...(body.subtypes ? { subtypes: JSON.stringify(body.subtypes) } : {}),
    ...(body.listingTypes ? { listingTypes: JSON.stringify(body.listingTypes) } : {}),
    ...(body.flags ? { flags: JSON.stringify(body.flags) } : {}),
  }

  const row = existing
    ? await prisma.propertyTaxonomy.update({
        where: { organizationId: scope.organizationId },
        data,
      })
    : await prisma.propertyTaxonomy.create({
        data: { organizationId: scope.organizationId, ...data },
      })

  await logAudit({ scope, action: 'update', entity: 'propertyTaxonomy', entityId: row.id })
  return NextResponse.json({ data: parseTaxonomy(row) })
}
