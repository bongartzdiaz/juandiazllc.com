/* ---------------------------------------------------------------
   SSRF guard for outbound webhook URLs (A-04).

   An org admin can register/patch a webhook URL that the server then
   POSTs to. Without validation, that URL can target cloud metadata
   (169.254.169.254), loopback, or RFC1918 internal services, and the
   captured response is readable back through the delivery log — a
   blind-and-reflected SSRF.

   Defense:
   - require https
   - reject internal hostnames (localhost/.local/.internal)
   - reject literal IPs in private/loopback/link-local/CGNAT/multicast
   - resolve the hostname and reject if ANY resolved address is non-public
     (run again at dispatch time to defeat DNS rebinding)
   --------------------------------------------------------------- */

import { promises as dns } from 'dns'
import net from 'net'

export class UnsafeWebhookUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsafeWebhookUrlError'
  }
}

/** True if an IPv4/IPv6 literal is non-publicly-routable (must be blocked).
 *  Pure + synchronous — the security core, unit-tested. A non-IP string
 *  returns true (fail closed). */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const o = ip.split('.').map(Number)
    if (o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
    if (o[0] === 0) return true                                   // 0.0.0.0/8 "this host"
    if (o[0] === 10) return true                                  // 10/8 private
    if (o[0] === 127) return true                                 // 127/8 loopback
    if (o[0] === 169 && o[1] === 254) return true                 // 169.254/16 link-local + cloud metadata
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true     // 172.16/12 private
    if (o[0] === 192 && o[1] === 168) return true                 // 192.168/16 private
    if (o[0] === 100 && o[1] >= 64 && o[1] <= 127) return true    // 100.64/10 CGNAT
    if (o[0] >= 224) return true                                  // 224/4 multicast + 240/4 reserved
    return false
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true            // loopback / unspecified
    if (lower.startsWith('fe80')) return true                     // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7 unique-local
    if (lower.startsWith('ff')) return true                       // multicast
    if (lower.startsWith('::ffff:')) {                            // IPv4-mapped
      const v4 = lower.slice('::ffff:'.length)
      if (net.isIPv4(v4)) return isBlockedIp(v4)
    }
    return false
  }
  return true // not a valid IP literal → fail closed
}

/** Hostnames that are never valid webhook targets regardless of resolution. */
function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase()
  return (
    h === 'localhost' ||
    h.endsWith('.localhost') ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h === 'metadata.google.internal'
  )
}

/** Parse + scheme-check + reject internal hostnames + literal private IPs.
 *  Pure (no DNS) — used by tests and as the synchronous first gate.
 *  Returns the validated URL's hostname for the async resolution step. */
export function validateWebhookUrlSync(rawUrl: string): string {
  let u: URL
  try {
    u = new URL(rawUrl)
  } catch {
    throw new UnsafeWebhookUrlError('Invalid webhook URL')
  }
  if (u.protocol !== 'https:') {
    throw new UnsafeWebhookUrlError('Webhook URL must use https')
  }
  const host = u.hostname.replace(/^\[|\]$/g, '') // strip IPv6 brackets
  if (!host || isBlockedHostname(host)) {
    throw new UnsafeWebhookUrlError('Webhook URL host is not allowed')
  }
  if (net.isIP(host) && isBlockedIp(host)) {
    throw new UnsafeWebhookUrlError('Webhook URL points to a non-public address')
  }
  return host
}

/** Full guard: sync checks + DNS resolution. Throws UnsafeWebhookUrlError
 *  on any unsafe condition. Call at create/patch AND at dispatch time. */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  const host = validateWebhookUrlSync(rawUrl)
  if (net.isIP(host)) return // already classified as public literal IP

  let addrs: Array<{ address: string }>
  try {
    addrs = await dns.lookup(host, { all: true })
  } catch {
    throw new UnsafeWebhookUrlError('Webhook host did not resolve')
  }
  if (addrs.length === 0) {
    throw new UnsafeWebhookUrlError('Webhook host did not resolve')
  }
  for (const a of addrs) {
    if (isBlockedIp(a.address)) {
      throw new UnsafeWebhookUrlError('Webhook URL resolves to a non-public address')
    }
  }
}
