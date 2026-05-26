/* Hermetic tests — autoMapHeaders + normaliseHeader.
   Real-world Whise / SweepBright / Realworks header strings are used
   as fixtures so the heuristic stays honest when those vendors change
   formats. */

import { describe, it, expect } from 'vitest'
import { autoMapHeaders, normaliseHeader } from './auto-map'

describe('normaliseHeader', () => {
  it('lowercases', () => {
    expect(normaliseHeader('Email')).toBe('email')
  })
  it('strips diacritics', () => {
    expect(normaliseHeader('Téléphone')).toBe('telephone')
    expect(normaliseHeader('Société')).toBe('societe')
  })
  it('strips punctuation and whitespace', () => {
    expect(normaliseHeader('E-mail')).toBe('email')
    expect(normaliseHeader('Phone Number')).toBe('phonenumber')
    expect(normaliseHeader('Phone / Mobile')).toBe('phonemobile')
  })
})

describe('autoMapHeaders', () => {
  it('handles a vanilla EN export', () => {
    expect(autoMapHeaders(['Name', 'Email', 'Phone', 'Company', 'Notes'])).toEqual({
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      company: 'Company',
      notes: 'Notes',
    })
  })

  it('handles a Whise NL export', () => {
    // Realistic header sample seen in Whise BENELUX contact exports.
    const headers = ['Naam', 'E-mail', 'Telefoon', 'Bedrijf', 'Opmerkingen']
    expect(autoMapHeaders(headers)).toEqual({
      name: 'Naam',
      email: 'E-mail',
      phone: 'Telefoon',
      company: 'Bedrijf',
      notes: 'Opmerkingen',
    })
  })

  it('handles a Wallonia (FR-BE) export with diacritics', () => {
    const headers = ['Nom', 'Adresse e-mail', 'Téléphone', 'Société', 'Remarques']
    expect(autoMapHeaders(headers)).toEqual({
      name: 'Nom',
      email: 'Adresse e-mail',
      phone: 'Téléphone',
      company: 'Société',
      notes: 'Remarques',
    })
  })

  it('handles ImmoScout24 (DE) export', () => {
    const headers = ['Vollername', 'E-Mail', 'Telefonnummer', 'Firma', 'Anmerkungen']
    const mapped = autoMapHeaders(headers)
    expect(mapped.name).toBe('Vollername')
    expect(mapped.email).toBe('E-Mail')
    expect(mapped.phone).toBe('Telefonnummer')
    expect(mapped.company).toBe('Firma')
    expect(mapped.notes).toBe('Anmerkungen')
  })

  it('handles Spanish export', () => {
    const headers = ['Nombre', 'Correo electrónico', 'Teléfono', 'Empresa']
    const mapped = autoMapHeaders(headers)
    expect(mapped.name).toBe('Nombre')
    expect(mapped.email).toBe('Correo electrónico')
    expect(mapped.phone).toBe('Teléfono')
    expect(mapped.company).toBe('Empresa')
    expect(mapped.notes).toBeUndefined()
  })

  it('skips unknown columns', () => {
    const headers = ['Name', 'Email', 'WeirdCustomField', 'AnotherWeirdOne']
    expect(autoMapHeaders(headers)).toEqual({
      name: 'Name',
      email: 'Email',
    })
  })

  it('returns empty object when no headers match', () => {
    expect(autoMapHeaders(['Col1', 'Col2', 'Col3'])).toEqual({})
  })

  it('does not assign the same column to two fields', () => {
    // "Mobile" matches phone hints; "Phone" also does. Each column should
    // get at most one assignment.
    const mapped = autoMapHeaders(['Name', 'Phone', 'Mobile'])
    expect(mapped.name).toBe('Name')
    // One of Phone/Mobile gets phone; the other isn't used.
    expect(mapped.phone).toMatch(/Phone|Mobile/)
    const usedCount = Object.values(mapped).filter(v => v === 'Phone' || v === 'Mobile').length
    expect(usedCount).toBe(1)
  })

  it('prefers exact match over substring match', () => {
    // "Phone Number" is more specific than "Phone Note" — but both score
    // against phone. The exact-/prefix-match scoring should favor whichever
    // matches the strongest hint.
    const headers = ['EmailAddress', 'Email']
    const mapped = autoMapHeaders(headers)
    // 'email' is exact-equal for 'Email' → highest score → wins
    expect(mapped.email).toBe('Email')
  })

  it('handles empty header array', () => {
    expect(autoMapHeaders([])).toEqual({})
  })

  it('is case-insensitive', () => {
    expect(autoMapHeaders(['NAME', 'EMAIL', 'PHONE'])).toEqual({
      name: 'NAME',
      email: 'EMAIL',
      phone: 'PHONE',
    })
  })
})
