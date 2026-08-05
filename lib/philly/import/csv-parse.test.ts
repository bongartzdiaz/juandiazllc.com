import { describe, it, expect } from 'vitest'
import { parseCsv, neutralizeFormula, suggestMapping, normaliseHeader } from './csv-parse'

describe('neutralizeFormula', () => {
  it('prefixes formula sentinels with a single quote', () => {
    expect(neutralizeFormula('=SUM(A1:A9)')).toBe(`'=SUM(A1:A9)`)
    expect(neutralizeFormula('+1234')).toBe(`'+1234`)
    expect(neutralizeFormula('-cmd|calc.exe')).toBe(`'-cmd|calc.exe`)
    expect(neutralizeFormula('@import')).toBe(`'@import`)
  })

  it('passes safe values through unchanged', () => {
    expect(neutralizeFormula('hello')).toBe('hello')
    expect(neutralizeFormula('foo@bar.com')).toBe('foo@bar.com') // @ inside, not at start
    expect(neutralizeFormula('')).toBe('')
  })
})

describe('parseCsv', () => {
  it('parses a simple CSV', () => {
    const text = 'name,email\nAlice,alice@example.com\nBob,bob@example.com\n'
    const r = parseCsv(text)
    expect(r.columns).toEqual(['name', 'email'])
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toEqual({ name: 'Alice', email: 'alice@example.com' })
  })

  it('handles quoted fields with commas', () => {
    const text = 'name,company\nAlice,"Acme, Inc."\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.company).toBe('Acme, Inc.')
  })

  it('handles escaped quotes inside quoted fields', () => {
    const text = 'name,quote\nAlice,"She said ""hi"""\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.quote).toBe('She said "hi"')
  })

  it('strips Windows carriage returns', () => {
    const text = 'name\r\nAlice\r\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.name).toBe('Alice')
  })

  it('skips blank lines without complaint', () => {
    const text = 'name\nAlice\n\nBob\n'
    const r = parseCsv(text)
    expect(r.rows.map(x => x.name)).toEqual(['Alice', 'Bob'])
  })

  it('reports rows with mismatched column counts as errors, not crashes', () => {
    const text = 'name,email\nAlice,alice@example.com,extra\nBob,bob@example.com\n'
    const r = parseCsv(text)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]?.line).toBe(2)
    expect(r.rows.map(x => x.name)).toEqual(['Bob'])
  })

  it('reports unterminated quotes', () => {
    const text = 'name,note\nAlice,"unclosed\n'
    const r = parseCsv(text)
    expect(r.errors.some(e => e.reason.includes('Unterminated'))).toBe(true)
  })

  it('neutralizes formula injection on import — defense against CSV-injection in re-export', () => {
    const text = 'name,email\n=SUM(A1:A9),alice@example.com\n'
    const r = parseCsv(text)
    expect(r.rows[0]?.name).toBe(`'=SUM(A1:A9)`)
  })

  it('returns empty result on empty input', () => {
    expect(parseCsv('').rows).toHaveLength(0)
  })
})

describe('suggestMapping', () => {
  it('matches common header variants to DEUS fields', () => {
    const m = suggestMapping(['Full Name', 'Email Address', 'Phone', 'Company', 'Notes'])
    expect(m['Full Name']).toBe('name')
    expect(m['Email Address']).toBe('email')
    expect(m['Phone']).toBe('phone')
    expect(m['Company']).toBe('company')
    expect(m['Notes']).toBe('notes')
  })

  it('falls back to skip for unknown headers — explicit-opt-in by user', () => {
    const m = suggestMapping(['favourite-cheese', 'department-id'])
    expect(m['favourite-cheese']).toBe('skip')
    expect(m['department-id']).toBe('skip')
  })

  it('handles snake_case + dashed variants', () => {
    const m = suggestMapping(['full_name', 'lead-source', 'lead_status'])
    expect(m['full_name']).toBe('name')
    expect(m['lead-source']).toBe('leadSource')
    expect(m['lead_status']).toBe('leadStatus')
  })

  it('is case-insensitive', () => {
    const m = suggestMapping(['NAME', 'EMAIL', 'PHONE'])
    expect(m['NAME']).toBe('name')
    expect(m['EMAIL']).toBe('email')
    expect(m['PHONE']).toBe('phone')
  })
})

/* ── Meertalige kolomherkenning ────────────────────────────────────────────
   Overgenomen uit de gesloten PR #52 (apps/philly-standalone/lib/philly/
   import/auto-map.ts). Die branch kon niet gemerged worden — het pad bestaat
   niet meer op main — maar het woordenboek is gebaseerd op echte Whise- en
   SweepBright-exports en dekt een gat: een Nederlandse export viel voorheen
   volledig door naar 'skip'. */

describe('normaliseHeader', () => {
  it('haalt scheidingstekens en hoofdletters weg', () => {
    expect(normaliseHeader('Phone Number')).toBe('phonenumber')
    expect(normaliseHeader('E-mail')).toBe('email')
    expect(normaliseHeader('lead_source')).toBe('leadsource')
  })

  it('haalt diakrieten weg', () => {
    expect(normaliseHeader('Téléphone')).toBe('telephone')
    expect(normaliseHeader('Adresse e-mail')).toBe('adresseemail')
    expect(normaliseHeader('Société')).toBe('societe')
  })

  it('een kop zonder letters wordt leeg', () => {
    expect(normaliseHeader('   ---   ')).toBe('')
  })
})

describe('suggestMapping — meertalig', () => {
  it('herkent een Nederlandse export', () => {
    const m = suggestMapping(['Naam', 'E-mailadres', 'Telefoonnummer', 'Bedrijf', 'Opmerkingen'])
    expect(m['Naam']).toBe('name')
    expect(m['E-mailadres']).toBe('email')
    expect(m['Telefoonnummer']).toBe('phone')
    expect(m['Bedrijf']).toBe('company')
    expect(m['Opmerkingen']).toBe('notes')
  })

  it('herkent een Duitse export', () => {
    const m = suggestMapping(['Vollständiger Name', 'E-Mail', 'Telefon', 'Unternehmen', 'Anmerkungen'])
    expect(m['Vollständiger Name']).toBe('name')
    expect(m['E-Mail']).toBe('email')
    expect(m['Telefon']).toBe('phone')
    expect(m['Unternehmen']).toBe('company')
    expect(m['Anmerkungen']).toBe('notes')
  })

  it('herkent een Spaanse export', () => {
    const m = suggestMapping(['Nombre completo', 'Correo electrónico', 'Móvil', 'Empresa'])
    expect(m['Nombre completo']).toBe('name')
    expect(m['Correo electrónico']).toBe('email')
    expect(m['Móvil']).toBe('phone')
    expect(m['Empresa']).toBe('company')
  })

  it('herkent een Franse export, inclusief diakrieten', () => {
    const m = suggestMapping(['Nom complet', 'Adresse e-mail', 'Téléphone', 'Société', 'Remarques'])
    expect(m['Nom complet']).toBe('name')
    expect(m['Adresse e-mail']).toBe('email')
    expect(m['Téléphone']).toBe('phone')
    expect(m['Société']).toBe('company')
    expect(m['Remarques']).toBe('notes')
  })
})

describe('suggestMapping — toewijzing', () => {
  // Voorheen kreeg elke kolom los een veld, dus beide kolommen werden email
  // en welke uiteindelijk won hing af van de volgorde.
  it('wijst een veld aan hooguit één kolom toe', () => {
    const m = suggestMapping(['Email', 'E-mail Address'])
    const velden = Object.values(m).filter((v) => v === 'email')
    expect(velden).toHaveLength(1)
    // Beide koppen matchen exact; de specifiekere term staat vooraan in het
    // woordenboek en wint daarom. Welke van de twee gekozen wordt is bij twee
    // e-mailkolommen sowieso een gok — waar het om gaat is dat het er één is,
    // zodat de operator ziet dat er iets te kiezen valt.
    expect(m['E-mail Address']).toBe('email')
    expect(m['Email']).toBe('skip')
  })

  it('kiest het specifiekere veld bij een overlappende kop', () => {
    // "Company Name" bevat "name", maar is exact een company-term.
    const m = suggestMapping(['Company Name', 'Full Name'])
    expect(m['Company Name']).toBe('company')
    expect(m['Full Name']).toBe('name')
  })

  it('leadstatus wint van status bij beide kolommen', () => {
    const m = suggestMapping(['Lead Status', 'Stage'])
    expect(m['Lead Status']).toBe('leadStatus')
    expect(m['Stage']).toBe('skip')
  })
})

describe('suggestMapping — geen valse treffers', () => {
  // 'tel' zit als deelstring in "Hotelnaam". Korte termen matchen daarom
  // alleen exact of als prefix.
  it('een korte term matcht niet als deelstring', () => {
    const m = suggestMapping(['Hotelnaam', 'Kasteel'])
    expect(m['Hotelnaam']).toBe('skip')
    expect(m['Kasteel']).toBe('skip')
  })

  it('onbekende koppen blijven skip', () => {
    const m = suggestMapping(['favourite-cheese', 'department-id', 'x'])
    expect(Object.values(m).every((v) => v === 'skip')).toBe(true)
  })

  it('een lege koplijst geeft een leeg resultaat', () => {
    expect(suggestMapping([])).toEqual({})
  })
})
