'use client'

/* Drag-and-drop uploader. Calls /api/documents/upload with multipart body. */

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react'

interface UploadedDoc {
  id: string
  name: string
  url: string
  mimeType: string
  sizeBytes: number
  type: string
}

interface FileUploadProps {
  entityType?: string
  entityId?: string
  multiple?: boolean
  onUploaded?: (doc: UploadedDoc) => void
  /** comma-separated list, e.g. "image/*,application/pdf" */
  accept?: string
  /** per-file size cap in bytes; default 20 MiB */
  maxBytes?: number
}

type Status = 'idle' | 'uploading' | 'success' | 'error'

interface FileState {
  name: string
  status: Status
  progress: number
  error?: string
  doc?: UploadedDoc
}

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Returns null if `file` matches one of the comma-separated patterns
 *  (mime types or extensions). Returns an error message otherwise. */
function checkAccept(file: File, accept?: string): string | null {
  if (!accept) return null
  const patterns = accept.split(',').map(p => p.trim().toLowerCase()).filter(Boolean)
  if (patterns.length === 0) return null
  const name = file.name.toLowerCase()
  const mime = (file.type || '').toLowerCase()
  for (const p of patterns) {
    if (p.startsWith('.')) {
      if (name.endsWith(p)) return null
    } else if (p.endsWith('/*')) {
      const base = p.slice(0, -2)
      if (mime.startsWith(`${base}/`)) return null
    } else if (mime === p) {
      return null
    }
  }
  return `File type not allowed (expected ${accept})`
}

export function FileUpload({
  entityType, entityId, multiple = true, onUploaded, accept, maxBytes = DEFAULT_MAX_BYTES,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<FileState[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File, idx: number) => {
    setFiles(prev => {
      const copy = [...prev]
      copy[idx] = { name: file.name, status: 'uploading', progress: 10 }
      return copy
    })
    try {
      const form = new FormData()
      form.append('file', file)
      if (entityType) form.append('entityType', entityType)
      if (entityId) form.append('entityId', entityId)

      const res = await fetch('/api/documents/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')

      setFiles(prev => {
        const copy = [...prev]
        copy[idx] = { name: file.name, status: 'success', progress: 100, doc: json.data }
        return copy
      })
      if (onUploaded) onUploaded(json.data)
    } catch (err) {
      setFiles(prev => {
        const copy = [...prev]
        copy[idx] = {
          name: file.name, status: 'error', progress: 0,
          error: err instanceof Error ? err.message : 'Upload failed',
        }
        return copy
      })
    }
  }, [entityType, entityId, onUploaded])

  const handleFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list)
    if (arr.length === 0) return

    // Pre-validate each file against accept + maxBytes; valid ones get uploaded,
    // invalid ones land in the list with status: 'error' so the user sees why.
    const validated: { file: File; rejection?: string }[] = arr.map(file => {
      if (file.size > maxBytes) {
        return { file, rejection: `Too large (${fmtSize(file.size)} > ${fmtSize(maxBytes)})` }
      }
      const acceptErr = checkAccept(file, accept)
      if (acceptErr) return { file, rejection: acceptErr }
      return { file }
    })

    const startIdx = files.length
    setFiles(prev => [
      ...prev,
      ...validated.map(({ file, rejection }) => rejection
        ? { name: file.name, status: 'error' as Status, progress: 0, error: rejection }
        : { name: file.name, status: 'idle' as Status, progress: 0 }),
    ])
    validated.forEach(({ file, rejection }, i) => {
      if (!rejection) uploadFile(file, startIdx + i)
    })
  }, [files.length, uploadFile, maxBytes, accept])

  const onDrag = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files)
    e.target.value = ''
  }

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx))

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: '28px 20px',
          background: dragActive ? 'var(--accent-bg)' : 'var(--panel)',
          textAlign: 'center', cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={onChange}
          style={{ display: 'none' }}
        />
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: dragActive ? 'var(--accent)' : 'var(--bg2)',
          color: dragActive ? '#fff' : 'var(--txt2)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10,
        }}>
          <Upload size={20} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 4 }}>
          {dragActive ? 'Drop files to upload' : 'Drop files or click to browse'}
        </div>
        <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
          {accept ? `Allowed: ${accept}` : 'Images, PDFs, documents'} · Max {fmtSize(maxBytes)} each
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map((f, i) => {
            const Icon = f.doc?.type === 'image' ? ImageIcon : FileText
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--panel)', border: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={14} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.name}
                  </div>
                  {f.status === 'uploading' && (
                    <div style={{
                      height: 3, borderRadius: 2, background: 'var(--bg2)',
                      overflow: 'hidden', marginTop: 4,
                    }}>
                      <div style={{
                        height: '100%', width: `${f.progress}%`,
                        background: 'var(--accent)', transition: 'width 0.3s ease',
                      }} />
                    </div>
                  )}
                  {f.status === 'error' && (
                    <div style={{ fontSize: 10.5, color: 'var(--r-txt)', marginTop: 2 }}>
                      {f.error}
                    </div>
                  )}
                  {f.status === 'success' && f.doc && (
                    <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 2 }}>
                      {fmtSize(f.doc.sizeBytes)} · Uploaded
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {f.status === 'success' && <CheckCircle2 size={15} color="var(--g-txt)" />}
                  {f.status === 'error' && <AlertCircle size={15} color="var(--r-txt)" />}
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--txt3)', padding: 2, borderRadius: 4,
                      display: 'flex', alignItems: 'center',
                    }}
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
