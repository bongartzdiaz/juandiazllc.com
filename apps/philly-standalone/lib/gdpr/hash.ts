import { createHash } from 'node:crypto'

/**
 * SHA-256 of a lowercased, trimmed email — used as a stable
 * identifier in GdprErasureLog / GdprExportLog without retaining
 * the original email after erasure.
 *
 * This is a one-way hash, so a regulator can verify
 * "you erased X's data" by hashing X's email and finding the row,
 * while we cannot reverse the hash to recover X's email after the
 * underlying records are deleted.
 *
 * Note: SHA-256 of a typical email is brute-forceable given a
 * dictionary of known emails, so this is *pseudonymisation*, not
 * anonymisation. Treat the hash itself as personal data while the
 * underlying record exists; once erased + 6 years pass, the residual
 * privacy risk is acceptable per Art. 5(1)(e).
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}
