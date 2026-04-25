import { describe, it, expect } from 'vitest'
import {
  PII_REGISTRY,
  modelsForSubject,
  modelsLookupByEmail,
  modelsLookupByOwner,
} from './pii-registry'

describe('PII_REGISTRY', () => {
  it('every entry has a unique model name', () => {
    const names = PII_REGISTRY.map((m) => m.model)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every entry declares at least one PII field', () => {
    for (const m of PII_REGISTRY) {
      expect(m.fields.length, m.model).toBeGreaterThan(0)
    }
  })

  it('every entry has a positive retention period', () => {
    for (const m of PII_REGISTRY) {
      expect(m.retentionDays, m.model).toBeGreaterThan(0)
    }
  })

  it('every field declares a recognised sensitivity tier', () => {
    const allowed = new Set(['basic', 'contact', 'identifier', 'financial', 'special'])
    for (const m of PII_REGISTRY) {
      for (const f of m.fields) {
        expect(allowed.has(f.sensitivity), `${m.model}.${f.name}: ${f.sensitivity}`).toBe(true)
      }
    }
  })

  it('every entry declares a recognised lawful basis', () => {
    const allowed = new Set([
      'contract',
      'legitimate_interest',
      'consent',
      'legal_obligation',
      'vital_interest',
      'public_task',
    ])
    for (const m of PII_REGISTRY) {
      expect(allowed.has(m.lawfulBasis), `${m.model}: ${m.lawfulBasis}`).toBe(true)
    }
  })
})

describe('helpers', () => {
  it('modelsForSubject splits operator vs contact correctly', () => {
    const operators = modelsForSubject('operator')
    const contacts = modelsForSubject('contact')
    expect(operators.every((m) => m.subject === 'operator')).toBe(true)
    expect(contacts.every((m) => m.subject === 'contact')).toBe(true)
    expect(operators.length + contacts.length).toBe(PII_REGISTRY.length)
  })

  it('modelsLookupByEmail returns only entries with a non-null emailField', () => {
    const result = modelsLookupByEmail()
    expect(result.every((m) => m.emailField !== null)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('modelsLookupByOwner returns only entries with a non-null ownerField', () => {
    const result = modelsLookupByOwner()
    expect(result.every((m) => m.ownerField !== null)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
