/* ---------------------------------------------------------------
   Storage abstraction — local filesystem in dev; pluggable adapter
   interface so S3 / R2 / Supabase-storage can drop in later.

   Files are written to `public/uploads/<orgId>/<cuid>-<filename>`
   so they're served directly by Next's static handler.
   --------------------------------------------------------------- */

import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.ms-excel',
  'text/plain', 'text/csv', 'text/markdown',
  'application/json',
  'application/zip',
])

function safeName(name: string): string {
  return name
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'file'
}

function classify(mime: string): 'image' | 'pdf' | 'spreadsheet' | 'file' {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.includes('spreadsheet') || mime === 'text/csv') return 'spreadsheet'
  return 'file'
}

export interface StoredFile {
  url: string
  name: string
  mimeType: string
  sizeBytes: number
  type: 'image' | 'pdf' | 'spreadsheet' | 'file'
}

export interface StoreOptions {
  organizationId: string
  file: File
}

/** Validate + persist an uploaded File object. Throws on violations. */
export async function storeFile({ organizationId, file }: StoreOptions): Promise<StoredFile> {
  if (!file) throw new Error('No file provided')
  if (file.size <= 0) throw new Error('Empty file')
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)`)
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported file type: ${mime}`)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const id = randomBytes(8).toString('hex')
  const cleaned = safeName(file.name || 'upload')
  const filename = `${id}-${cleaned}`

  const dir = join(process.cwd(), 'public', 'uploads', organizationId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), buffer)

  return {
    url: `/uploads/${organizationId}/${filename}`,
    name: file.name || cleaned,
    mimeType: mime,
    sizeBytes: file.size,
    type: classify(mime),
  }
}
