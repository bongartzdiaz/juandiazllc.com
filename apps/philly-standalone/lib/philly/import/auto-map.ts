/* Heuristic column-mapping for CSV / XLSX contact imports.
   ──────────────────────────────────────────────────────────────────
   Given a list of headers from an uploaded file, guess which header
   maps to each Contact field. The mapping is a best-effort suggestion
   — the UI always shows the result + lets the operator override.

   Matching is case-insensitive and tolerant of common variants:
     - "Email", "E-mail", "email_address", "Adresse e-mail"
     - "Phone", "Phone Number", "Mobile", "Telefoon", "Téléphone"
     - "Name", "Full Name", "Voornaam + Achternaam", "Nom"
     - "Company", "Bedrijf", "Société"

   Multi-locale: the dictionaries below cover EN + NL + DE + ES + FR
   common variants seen in real Whise / SweepBright / Realworks exports.

   Pure function — no I/O, no state. Reusable from a test, a script,
   or the modal directly. */

export interface AutoMapResult {
  name?: string
  email?: string
  phone?: string
  company?: string
  notes?: string
}

// Dictionaries are ranked — earlier entries are stronger signals. A header
// matches if its normalised form starts with or equals one of these.
// Normalisation: lowercase, strip diacritics, collapse non-alphanumerics
// (so "Phone Number" → "phonenumber", "E-mail" → "email").
const FIELD_HINTS: Record<keyof AutoMapResult, readonly string[]> = {
  name: [
    'fullname', 'name',
    // Sometimes split — we won't try to concat first+last automatically;
    // we just point at whichever full-name column exists.
    'voornaamachternaam', 'vollername', 'nomcomplet', 'nombrecompleto',
    'nom', 'naam', 'nombre',
  ],
  email: [
    'email', 'emailaddress', 'adresseemail',
    'correoelectronico', 'epost', 'emailadres',
    'mail',
  ],
  phone: [
    'phone', 'phonenumber', 'mobile', 'mobilephone',
    'telefoon', 'telefon', 'telephone',
    'tel', 'gsm', 'tlf',
  ],
  company: [
    'company', 'companyname', 'organisation', 'organization',
    'bedrijf', 'firma', 'unternehmen',
    'empresa', 'entreprise', 'societe',
  ],
  notes: [
    'notes', 'note', 'comments', 'remarks',
    'opmerkingen', 'anmerkungen', 'observaciones', 'remarques',
  ],
}

/** Normalise a header for comparison — lowercased, no diacritics, no separators. */
export function normaliseHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Score a header against a field's hint list. Higher = better match.
 *  Returns 0 for no match. */
function scoreHeader(headerNorm: string, hints: readonly string[]): number {
  for (let i = 0; i < hints.length; i++) {
    const hint = hints[i]
    if (headerNorm === hint) return 1000 - i           // exact match — best
    if (headerNorm.startsWith(hint)) return 500 - i    // prefix match
    if (headerNorm.includes(hint)) return 100 - i      // substring
  }
  return 0
}

/** Choose the best header for each Contact field. Each header can only be
 *  picked once — if two fields both want the same column, the field with
 *  the higher score wins and the runner-up gets its second-best. */
export function autoMapHeaders(headers: readonly string[]): AutoMapResult {
  // Pre-compute (fieldKey, header, score) triples for every pairing.
  type Triple = { field: keyof AutoMapResult; header: string; score: number }
  const triples: Triple[] = []
  const headerNorms = headers.map(h => normaliseHeader(h))

  for (const field of Object.keys(FIELD_HINTS) as (keyof AutoMapResult)[]) {
    for (let i = 0; i < headers.length; i++) {
      const score = scoreHeader(headerNorms[i], FIELD_HINTS[field])
      if (score > 0) triples.push({ field, header: headers[i], score })
    }
  }

  // Greedy assignment by descending score, each header used at most once,
  // each field assigned at most once.
  triples.sort((a, b) => b.score - a.score)
  const result: AutoMapResult = {}
  const usedHeaders = new Set<string>()

  for (const { field, header, score } of triples) {
    if (result[field]) continue          // field already assigned
    if (usedHeaders.has(header)) continue
    if (score <= 0) continue
    result[field] = header
    usedHeaders.add(header)
  }

  return result
}
