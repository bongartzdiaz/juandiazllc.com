import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { attributeSchema, generateContactAttributes } from './contact-attributes'

describe('attributeSchema', () => {
  it('accepts a well-formed attribute object', () => {
    const parsed = attributeSchema.parse({
      industry: 'Residential solar',
      icpFit: 82,
      summary: 'Experienced operator running a mid-market installer in NL; good fit for CRM + ROI funnel work.',
    })
    expect(parsed.industry).toBe('Residential solar')
    expect(parsed.icpFit).toBe(82)
  })

  it('rejects icpFit outside 0-100', () => {
    expect(() =>
      attributeSchema.parse({ industry: 'X', icpFit: 120, summary: 'a'.repeat(50) }),
    ).toThrow()
    expect(() =>
      attributeSchema.parse({ industry: 'X', icpFit: -1, summary: 'a'.repeat(50) }),
    ).toThrow()
  })

  it('rejects summaries that are too short', () => {
    expect(() =>
      attributeSchema.parse({ industry: 'X', icpFit: 50, summary: 'too short' }),
    ).toThrow()
  })

  it('rejects industry strings that are too long', () => {
    expect(() =>
      attributeSchema.parse({
        industry: 'a'.repeat(80),
        icpFit: 50,
        summary: 'a'.repeat(50),
      }),
    ).toThrow()
  })
})

describe('generateContactAttributes (no API key)', () => {
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  afterEach(() => {
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved
  })

  it('returns a clear error when ANTHROPIC_API_KEY is not configured', async () => {
    const result = await generateContactAttributes({
      name: 'Test',
      email: '',
      phone: '',
      company: '',
      type: 'stakeholder',
      notes: '',
      leadSource: '',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ANTHROPIC_API_KEY/)
  })
})
