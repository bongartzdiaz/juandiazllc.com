'use client'

import { useState } from 'react'
import { FormField } from '@/components/ui/Modal'
import { useIndustry } from '@/hooks/useIndustry'

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => void
  onCancel: () => void
  initial?: Partial<ContactFormData>
}

export interface ContactFormData {
  name: string
  email: string
  phone: string
  type: string
  company: string
  notes: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactForm({ onSubmit, onCancel, initial }: ContactFormProps) {
  const { config } = useIndustry()

  const [form, setForm] = useState<ContactFormData>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    type: initial?.type ?? config.contactTypes[0],
    company: initial?.company ?? '',
    notes: initial?.notes ?? '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({})

  const update = (field: keyof ContactFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof ContactFormData, string>> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.email.trim()) {
      next.email = 'Email is required'
    } else if (!emailRegex.test(form.email)) {
      next.email = 'Invalid email format'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
  }

  const errorStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--r)',
    marginTop: 4,
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Name" required>
        <input
          style={inputStyle}
          placeholder="Full name"
          value={form.name}
          onChange={e => update('name', e.target.value)}
        />
        {errors.name && <div style={errorStyle}>{errors.name}</div>}
      </FormField>

      <FormField label="Email" required>
        <input
          style={inputStyle}
          type="email"
          placeholder="email@example.com"
          value={form.email}
          onChange={e => update('email', e.target.value)}
        />
        {errors.email && <div style={errorStyle}>{errors.email}</div>}
      </FormField>

      <FormField label="Phone">
        <input
          style={inputStyle}
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={form.phone}
          onChange={e => update('phone', e.target.value)}
        />
      </FormField>

      <FormField label="Type">
        <select
          style={inputStyle}
          value={form.type}
          onChange={e => update('type', e.target.value)}
        >
          {config.contactTypes.map(t => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Company">
        <input
          style={inputStyle}
          placeholder="Organization or company"
          value={form.company}
          onChange={e => update('company', e.target.value)}
        />
      </FormField>

      <FormField label="Notes">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          placeholder="Additional notes..."
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
        />
      </FormField>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg2)',
            color: 'var(--txt2)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {initial ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </form>
  )
}
