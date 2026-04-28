/* ---------------------------------------------------------------
   Per-organisation IP allowlist
   ---------------------------------------------------------------
   `Organization.ipAllowlist` is a comma-separated list of CIDR
   ranges (IPv4 or IPv6). NULL or empty = no restriction (default
   for every org). When non-empty, requireScope() rejects with 403
   when the request's client IP is not in any of the listed ranges.

   We intentionally do NOT auto-trust loopback or RFC1918. The
   admin chooses what to trust. This is what enterprise customers
   ask for in security questionnaires — a hard fence, no implicit
   exemptions.

   Single-IP entries (no `/`) are accepted and treated as `/32`
   (v4) or `/128` (v6) for ergonomics.

   Designed pure & dependency-free so it can be unit-tested without
   spinning up a real Next.js request.
   --------------------------------------------------------------- */

export interface IpAllowlistMatch {
  /** True if the IP is in any of the parsed ranges. */
  ok: boolean
  /** Number of valid ranges parsed (rejected entries are skipped, not fatal). */
  validRanges: number
  /** Entries that failed to parse — surfaced for admin diagnostics. */
  invalid: string[]
}

/**
 * Returns true if `ipAllowlistRaw` is null/empty/all-whitespace —
 * meaning the org has no restriction configured, which is the
 * default and most common case.
 */
export function isAllowlistOpen(ipAllowlistRaw: string | null | undefined): boolean {
  if (ipAllowlistRaw == null) return true
  return ipAllowlistRaw.trim() === ''
}

export function checkIpAllowlist(
  ip: string,
  ipAllowlistRaw: string | null | undefined,
): IpAllowlistMatch {
  if (isAllowlistOpen(ipAllowlistRaw)) {
    return { ok: true, validRanges: 0, invalid: [] }
  }
  const entries = (ipAllowlistRaw as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const invalid: string[] = []
  let validRanges = 0
  let matched = false

  for (const entry of entries) {
    const range = parseCidr(entry)
    if (!range) {
      invalid.push(entry)
      continue
    }
    validRanges += 1
    if (matched) continue
    if (ipInRange(ip, range)) matched = true
  }

  return { ok: matched, validRanges, invalid }
}

interface ParsedRange {
  family: 4 | 6
  /** Address as a BigInt for uniform comparison across v4 / v6. */
  network: bigint
  /** Number of high-order bits that must match. */
  prefix: number
}

export function parseCidr(entry: string): ParsedRange | null {
  const slash = entry.indexOf('/')
  const ipPart = slash === -1 ? entry : entry.slice(0, slash)
  const prefixPart = slash === -1 ? null : entry.slice(slash + 1)

  const ip = parseIp(ipPart)
  if (!ip) return null

  const maxPrefix = ip.family === 4 ? 32 : 128
  let prefix = maxPrefix
  if (prefixPart != null) {
    const p = Number(prefixPart)
    if (!Number.isInteger(p) || p < 0 || p > maxPrefix) return null
    prefix = p
  }

  // Mask the address down to the network portion. This means
  // 10.0.0.5/24 normalises to 10.0.0.0/24 — useful so two
  // semantically-identical ranges compare equal.
  const hostBits = BigInt(maxPrefix - prefix)
  const mask = hostBits === 0n
    ? (1n << BigInt(maxPrefix)) - 1n
    : ((1n << BigInt(maxPrefix)) - 1n) ^ ((1n << hostBits) - 1n)
  const network = ip.value & mask

  return { family: ip.family, network, prefix }
}

interface ParsedIp {
  family: 4 | 6
  value: bigint
}

export function parseIp(s: string): ParsedIp | null {
  if (!s) return null
  // Strip a possible IPv6 zone identifier (fe80::1%eth0)
  const cleaned = s.includes('%') ? s.slice(0, s.indexOf('%')) : s

  if (cleaned.includes('.') && !cleaned.includes(':')) {
    return parseIpv4(cleaned)
  }
  if (cleaned.includes(':')) {
    // IPv4-mapped IPv6 (::ffff:1.2.3.4)
    if (cleaned.toLowerCase().startsWith('::ffff:') && cleaned.includes('.')) {
      const v4 = parseIpv4(cleaned.slice('::ffff:'.length))
      if (v4) return v4
    }
    return parseIpv6(cleaned)
  }
  return null
}

function parseIpv4(s: string): ParsedIp | null {
  const parts = s.split('.')
  if (parts.length !== 4) return null
  let val = 0n
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const n = Number(part)
    if (n < 0 || n > 255) return null
    val = (val << 8n) | BigInt(n)
  }
  return { family: 4, value: val }
}

function parseIpv6(s: string): ParsedIp | null {
  // Handle the :: shorthand. Refuse multiple ::.
  const dblColon = s.split('::')
  if (dblColon.length > 2) return null
  let head: string[] = []
  let tail: string[] = []
  if (dblColon.length === 2) {
    head = dblColon[0] === '' ? [] : dblColon[0].split(':')
    tail = dblColon[1] === '' ? [] : dblColon[1].split(':')
  } else {
    head = s.split(':')
  }
  const groups = head.length + tail.length
  if (groups > 8) return null
  if (dblColon.length === 1 && groups !== 8) return null
  const fill = 8 - groups
  const all = [...head, ...Array(fill).fill('0'), ...tail]
  if (all.length !== 8) return null

  let val = 0n
  for (const g of all) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null
    val = (val << 16n) | BigInt(parseInt(g, 16))
  }
  return { family: 6, value: val }
}

function ipInRange(ipStr: string, range: ParsedRange): boolean {
  const ip = parseIp(ipStr)
  if (!ip) return false
  if (ip.family !== range.family) return false
  const maxPrefix = ip.family === 4 ? 32 : 128
  const hostBits = BigInt(maxPrefix - range.prefix)
  const mask = hostBits === 0n
    ? (1n << BigInt(maxPrefix)) - 1n
    : ((1n << BigInt(maxPrefix)) - 1n) ^ ((1n << hostBits) - 1n)
  return (ip.value & mask) === range.network
}
