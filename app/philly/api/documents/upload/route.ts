/* POST /api/documents/upload — multipart file upload */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { storeFile } from '@/lib/philly/storage'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { serverError } from '@/lib/philly/safe-error'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let form: FormData
  try { form = await req.formData() }
  catch { return jsonError('Expected multipart/form-data', 400) }

  const file = form.get('file')
  if (!(file instanceof File)) return jsonError('file field is required', 400)

  const entityType = (form.get('entityType') as string | null) ?? null
  const entityId = (form.get('entityId') as string | null) ?? null

  let stored
  try {
    stored = await storeFile({ organizationId: scope.organizationId, file })
  } catch (err) {
    return serverError(err, 'Upload failed', 400)
  }

  const prisma = getAuthPrisma()
  const doc = await prisma.document.create({
    data: {
      organizationId: scope.organizationId,
      name: stored.name,
      type: stored.type,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      url: stored.url,
      entityType,
      entityId,
      uploadedBy: scope.userId,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'document', entityId: doc.id })
  publishEntityCreated(scope.organizationId, 'document', doc.id, scope.userId)

  return NextResponse.json({ data: doc }, { status: 201 })
}
