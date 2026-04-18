'use client'

import { useState } from 'react'
import { FormField } from '@/components/ui/Modal'
import { useIndustry } from '@/hooks/useIndustry'

interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void
  onCancel: () => void
  initial?: Partial<ProjectFormData>
}

export interface ProjectFormData {
  title: string
  description: string
  category: string
  status: string
  startDate: string
  endDate: string
  budget: number | ''
  sdgGoals: number[]
  propertyType: string
}

const CSR_CATEGORIES = ['Education', 'Health', 'Environment', 'Community', 'Economic Development', 'Other']
const RE_CATEGORIES = ['Acquisition', 'Development', 'Renovation', 'Management', 'Sale', 'Other']
const HOS_CATEGORIES = ['Renovation', 'Expansion', 'Operations', 'Marketing', 'Staffing', 'Other']
const STATUSES = ['planned', 'active', 'paused', 'completed']
const PROPERTY_TYPES = ['Residential', 'Commercial', 'Rental', 'Mixed-Use']

export function ProjectForm({ onSubmit, onCancel, initial }: ProjectFormProps) {
  const { industry } = useIndustry()

  const categories =
    industry === 'philanthropy' ? CSR_CATEGORIES :
    industry === 'realestate' ? RE_CATEGORIES :
    HOS_CATEGORIES

  const [form, setForm] = useState<ProjectFormData>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? categories[0],
    status: initial?.status ?? 'planned',
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
    budget: initial?.budget ?? '',
    sdgGoals: initial?.sdgGoals ?? [],
    propertyType: initial?.propertyType ?? PROPERTY_TYPES[0],
  })

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const update = <K extends keyof ProjectFormData>(field: K, value: ProjectFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const toggleSdg = (goal: number) => {
    setForm(prev => ({
      ...prev,
      sdgGoals: prev.sdgGoals.includes(goal)
        ? prev.sdgGoals.filter(g => g !== goal)
        : [...prev.sdgGoals, goal].sort((a, b) => a - b),
    }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<string, string>> = {}
    if (!form.title.trim()) next.title = 'Title is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) onSubmit(form)
  }

  const inputStyle: React.CSSProperties = { width: '100%' }
  const errorStyle: React.CSSProperties = { fontSize: 11, color: 'var(--r)', marginTop: 4 }

  const isRE = industry === 'realestate'
  const isCSR = industry === 'philanthropy'
  const budgetLabel = isRE ? 'Price' : 'Budget'

  return (
    <form onSubmit={handleSubmit}>
      <FormField label="Title" required>
        <input
          style={inputStyle}
          placeholder={isRE ? 'Property name or address' : 'Project title'}
          value={form.title}
          onChange={e => update('title', e.target.value)}
        />
        {errors.title && <div style={errorStyle}>{errors.title}</div>}
      </FormField>

      <FormField label="Description">
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          placeholder="Brief description..."
          value={form.description}
          onChange={e => update('description', e.target.value)}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Category">
          <select
            style={inputStyle}
            value={form.category}
            onChange={e => update('category', e.target.value)}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Status">
          <select
            style={inputStyle}
            value={form.status}
            onChange={e => update('status', e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {isRE && (
        <FormField label="Property Type">
          <select
            style={inputStyle}
            value={form.propertyType}
            onChange={e => update('propertyType', e.target.value)}
          >
            {PROPERTY_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </FormField>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormField label="Start Date">
          <input
            style={inputStyle}
            type="date"
            value={form.startDate}
            onChange={e => update('startDate', e.target.value)}
          />
        </FormField>

        <FormField label="End Date">
          <input
            style={inputStyle}
            type="date"
            value={form.endDate}
            onChange={e => update('endDate', e.target.value)}
          />
        </FormField>
      </div>

      <FormField label={budgetLabel}>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--txt3)', fontSize: 13, fontWeight: 500, pointerEvents: 'none',
          }}>
            EUR
          </span>
          <input
            style={{ ...inputStyle, paddingLeft: 46 }}
            type="number"
            min={0}
            placeholder="0"
            value={form.budget}
            onChange={e => update('budget', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </FormField>

      {isCSR && (
        <FormField label="SDG Goals">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
            gap: 6,
          }}>
            {Array.from({ length: 17 }, (_, i) => i + 1).map(goal => {
              const selected = form.sdgGoals.includes(goal)
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleSdg(goal)}
                  style={{
                    width: '100%', aspectRatio: '1', borderRadius: 8,
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: selected ? 'var(--accent-bg)' : 'var(--panel)',
                    color: selected ? 'var(--accent-txt)' : 'var(--txt2)',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {goal}
                </button>
              )
            })}
          </div>
        </FormField>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--txt2)', cursor: 'pointer', fontWeight: 500, fontSize: 13,
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '8px 18px', borderRadius: 8,
            border: 'none', background: 'var(--accent)', color: '#fff',
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}
        >
          {initial ? 'Save Changes' : isRE ? 'Add Property' : 'Add Project'}
        </button>
      </div>
    </form>
  )
}
