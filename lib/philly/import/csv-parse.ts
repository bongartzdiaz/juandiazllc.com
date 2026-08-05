/* ---------------------------------------------------------------
   Minimal CSV parser + formula-injection neutralization.

   We parse CSV on the *client* and POST the resulting JSON rows to
   /api/contacts/import. Reasons:
     1. The server doesn't have to deal with multipart bodies +
        encoding-detection + CSV parser CVEs.
     2. We can preview + map columns before any data hits the DB.
     3. Server still validates every row via Zod — client-side parsing
        is convenience, not trust.

   Formula injection (CSV escape on re-export): cells beginning with
   `=`, `+`, `-`, `@` are prefixed with a single quote when re-emitted.
   We do this on parse so even if downstream code re-exports we stay
   safe. See: OWASP "CSV Injection".
   --------------------------------------------------------------- */

export interface ParseResult {
  /** Detected header row, in source order. */
  columns: string[]
  /** Body rows, each as an object keyed by header. */
  rows: Record<string, string>[]
  /** Total rows seen including the header. */
  totalLines: number
  /** Rows that failed to parse (bad quoting, mismatched cols). */
  errors: { line: number; reason: string }[]
}

/** Hard cap on the input CSV size we parse client-side. 5 MB is plenty for
 *  the 10k-row max we accept on the import endpoint, and prevents accidental
 *  bricking of the browser tab on a huge file. */
export const MAX_CSV_BYTES = 5 * 1024 * 1024

const FORMULA_PREFIXES = new Set(['=', '+', '-', '@'])

/** Neutralize CSV-injection sentinels. Idempotent. */
export function neutralizeFormula(value: string): string {
  if (!value) return value
  if (FORMULA_PREFIXES.has(value[0]!)) {
    return `'${value}`
  }
  return value
}

/**
 * Parses a CSV text into headers + row objects.
 * Supports double-quoted fields with embedded commas, newlines, and
 * "" (escaped quote inside quoted field). Trims surrounding whitespace
 * on every cell. Empty trailing lines are ignored.
 */
export function parseCsv(text: string): ParseResult {
  const errors: ParseResult['errors'] = []
  const allRows = parseRows(text, errors)

  if (allRows.length === 0) {
    return { columns: [], rows: [], totalLines: 0, errors }
  }

  const columns = (allRows[0] ?? []).map((h) => h.trim())
  const dataRows = allRows.slice(1)

  const rows: Record<string, string>[] = []
  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i]!
    if (cells.length === 1 && cells[0] === '') continue // blank line
    if (cells.length !== columns.length) {
      errors.push({
        line: i + 2,
        reason: `Expected ${columns.length} columns, got ${cells.length}`,
      })
      continue
    }
    const row: Record<string, string> = {}
    for (let c = 0; c < columns.length; c++) {
      const key = columns[c]!
      const raw = cells[c] ?? ''
      row[key] = neutralizeFormula(raw.trim())
    }
    rows.push(row)
  }

  return { columns, rows, totalLines: allRows.length, errors }
}

/** Splits CSV text into an array of rows, each an array of cells. */
function parseRows(text: string, errors: ParseResult['errors']): string[][] {
  const out: string[][] = []
  let cur: string[] = []
  let cell = ''
  let inQuotes = false
  let line = 1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      cur.push(cell)
      cell = ''
      continue
    }
    if (ch === '\r') continue // strip carriage returns
    if (ch === '\n') {
      cur.push(cell)
      out.push(cur)
      cur = []
      cell = ''
      line++
      continue
    }
    cell += ch
  }

  // Trailing cell / row (no final newline)
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell)
    out.push(cur)
  }

  if (inQuotes) {
    errors.push({ line, reason: 'Unterminated quoted field' })
  }

  return out
}

/* ── Column-name auto-mapping ──────────────────────────────────────
   When a customer uploads a CSV with arbitrary headers, we suggest
   which DEUS contact field each header probably maps to. The user
   can override every suggestion before submitting. */

export type ContactImportField =
  | 'name' | 'email' | 'phone' | 'company' | 'type'
  | 'notes' | 'leadSource' | 'leadStatus' | 'skip'

/** Woordenboek per veld, gerangschikt: eerdere termen zijn sterkere signalen.
 *
 *  Meertalig, want de eerste echte migratie komt uit Whise en SweepBright en
 *  die exporteren in de taal van de makelaar. Een Nederlandse export met een
 *  kolom "Bedrijf" viel voorheen door naar 'skip', omdat de patronen alleen
 *  Engels dekten. Termen komen uit de kolomkoppen van echte exports.
 *
 *  Vergelijking gebeurt op de genormaliseerde vorm (zie normaliseHeader), dus
 *  "E-mail" → "email" en "Téléphone" → "telephone". */
const FIELD_HINTS: Array<{ field: ContactImportField; hints: readonly string[] }> = [
  { field: 'name', hints: [
    'fullname', 'contactname', 'volledigenaam', 'voornaamachternaam',
    'vollstandigername', 'nomcomplet', 'nombrecompleto',
    'name', 'naam', 'nombre', 'nom',
  ] },
  { field: 'email', hints: [
    'emailaddress', 'emailadres', 'adresseemail', 'correoelectronico',
    'email', 'eposta', 'epost', 'mail',
  ] },
  { field: 'phone', hints: [
    'phonenumber', 'telefoonnummer', 'mobilephone', 'telephone',
    'telefoon', 'telefon', 'mobile', 'phone', 'movil',
    'tel', 'gsm', 'tlf',
  ] },
  { field: 'company', hints: [
    'companyname', 'bedrijfsnaam', 'organisation', 'organization',
    'organisatie', 'unternehmen', 'entreprise', 'company',
    'bedrijf', 'empresa', 'societe', 'firma', 'employer', 'business',
  ] },
  { field: 'type', hints: [
    'contacttype', 'categorie', 'kategorie', 'categoria', 'category',
    'type', 'kind', 'soort',
  ] },
  { field: 'notes', hints: [
    'opmerkingen', 'observaciones', 'anmerkungen', 'bemerkungen',
    'commentaires', 'remarques', 'comments', 'notities',
    'remarks', 'notes', 'note',
  ] },
  { field: 'leadSource', hints: [
    'leadsource', 'provenance', 'herkomst', 'source', 'quelle',
    'origen', 'fuente', 'channel', 'kanal', 'canal', 'bron',
  ] },
  { field: 'leadStatus', hints: [
    'leadstatus', 'stadium', 'status', 'statut', 'estado',
    'etapa', 'stage', 'fase',
  ] },
]

/** Kortere termen matchen alleen exact of als prefix. Zonder deze grens zou
 *  'tel' als deelstring in "Hotelnaam" zitten en die kolom naar phone sturen. */
const MIN_DEELSTRING = 5

/** Kop naar vergelijkbare vorm: kleine letters, zonder diakrieten, zonder
 *  scheidingstekens. "Phone Number" → "phonenumber", "Adresse e-mail" →
 *  "adresseemail". */
export function normaliseHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Hoger is een betere match; 0 is geen match. */
function score(headerNorm: string, hints: readonly string[]): number {
  for (let i = 0; i < hints.length; i++) {
    const hint = hints[i]
    if (headerNorm === hint) return 1000 - i
    if (headerNorm.startsWith(hint)) return 500 - i
    if (hint.length >= MIN_DEELSTRING && headerNorm.includes(hint)) return 100 - i
  }
  return 0
}

/** Returns an auto-mapping for the given headers. Headers that don't match
 *  anything map to 'skip' so they're explicitly excluded by default.
 *
 *  Elke kolom krijgt hooguit één veld en elk veld hooguit één kolom. Voorheen
 *  werd elke kolom los beoordeeld, dus "Email" en "E-mail Address" wezen
 *  allebei naar email en welke won hing af van de volgorde. De operator kan in
 *  de interface nog steeds twee kolommen op hetzelfde veld zetten; dit gaat
 *  alleen over wat we voorstellen. */
export function suggestMapping(columns: string[]): Record<string, ContactImportField> {
  const genormaliseerd = columns.map((c) => normaliseHeader(c))

  type Kandidaat = { kolom: number; field: ContactImportField; punten: number }
  const kandidaten: Kandidaat[] = []
  for (const { field, hints } of FIELD_HINTS) {
    for (let i = 0; i < columns.length; i++) {
      const punten = score(genormaliseerd[i], hints)
      if (punten > 0) kandidaten.push({ kolom: i, field, punten })
    }
  }
  kandidaten.sort((a, b) => b.punten - a.punten)

  const out: Record<string, ContactImportField> = {}
  for (const col of columns) out[col] = 'skip'

  const kolomBezet = new Set<number>()
  const veldBezet = new Set<ContactImportField>()
  for (const { kolom, field, punten } of kandidaten) {
    if (punten <= 0) continue
    if (kolomBezet.has(kolom) || veldBezet.has(field)) continue
    out[columns[kolom]] = field
    kolomBezet.add(kolom)
    veldBezet.add(field)
  }
  return out
}
