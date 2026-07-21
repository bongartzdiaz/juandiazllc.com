/* ---------------------------------------------------------------
   Derive a likely company website from a contact's email address.

   Used by the AI-attributes enrichment path to decide whether there
   is a company site worth fetching. Deliberately conservative: we
   would rather skip enrichment than fetch a stranger's personal
   homepage, because every fetch is processing of personal data that
   the controller did not collect themselves (see
   docs/legal/DPIA-AI-ATTRIBUTES.md §1.2a).

   Rules:
     - Consumer mailbox providers are never derived from. A gmail.com
       address tells us nothing about an employer, and fetching
       gmail.com is pointless.
     - Disposable/relay domains are skipped for the same reason.
     - Public-suffix-only inputs (e.g. "user@co.uk") are rejected.
     - The result is always https:// on the bare registrable domain.
       We never derive deep paths — the homepage is the least
       intrusive thing to read.
   --------------------------------------------------------------- */

/** Mailbox providers where the domain says nothing about an employer. */
const CONSUMER_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.nl',
  'live.com',
  'live.nl',
  'msn.com',
  'yahoo.com',
  'yahoo.co.uk',
  'ymail.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'tutanota.com',
  'tuta.io',
  'zoho.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'web.de',
  't-online.de',
  'freenet.de',
  'mail.com',
  'mail.ru',
  'yandex.ru',
  'qq.com',
  '163.com',
  '126.com',
  // NL / BE consumer ISPs — common in this customer base.
  'ziggo.nl',
  'kpnmail.nl',
  'planet.nl',
  'hetnet.nl',
  'home.nl',
  'casema.nl',
  'chello.nl',
  'telenet.be',
  'skynet.be',
  // ES / DE consumer ISPs.
  'telefonica.net',
  'terra.es',
  'wanadoo.es',
])

/** Throwaway / forwarding services — never a company site. */
const DISPOSABLE_MAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'fakeinbox.com',
  'privaterelay.appleid.com',
  'simplelogin.com',
  'anonaddy.com',
  'duck.com',
  'relay.firefox.com',
])

/* Multi-label public suffixes we actually encounter. A full PSL is
   overkill here — the cost of a miss is that we skip enrichment for
   an unusual TLD, which is the safe direction to fail in. */
const MULTI_LABEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'me.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'com.br',
  'com.mx',
  'co.za',
  'com.tr',
  'co.jp',
  'or.jp',
  'ne.jp',
  'co.kr',
  'com.cn',
  'com.hk',
  'com.sg',
  'co.in',
  'com.ar',
])

export interface CompanyDomainResult {
  /** https:// URL of the registrable domain, or null when skipped. */
  url: string | null
  /** Bare registrable domain (e.g. "acmesolar.nl"), or null. */
  domain: string | null
  /** Why we skipped, for logging + operator-facing explanation. */
  skipped?:
    | 'no-email'
    | 'malformed'
    | 'consumer-mailbox'
    | 'disposable'
    | 'public-suffix-only'
}

/** Normalise the domain part of an email address. */
function domainOf(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return null

  const domain = trimmed.slice(at + 1)
  // Reject anything that isn't a plausible hostname. No underscores,
  // no spaces, must contain a dot, must not start/end with a dot or
  // hyphen, and every label must be non-empty.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return null
  }
  return domain
}

/** Reduce a hostname to its registrable domain (strip subdomains). */
export function registrableDomain(host: string): string | null {
  const labels = host.split('.')
  if (labels.length < 2) return null

  const lastTwo = labels.slice(-2).join('.')
  if (MULTI_LABEL_SUFFIXES.has(lastTwo)) {
    // Need three labels for e.g. "acme.co.uk"; "co.uk" alone is a
    // public suffix and not a registrable domain.
    if (labels.length < 3) return null
    return labels.slice(-3).join('.')
  }
  return lastTwo
}

/**
 * Decide whether a contact's email implies a company website we may
 * fetch, and return that URL.
 *
 * Returns `{ url: null, skipped: <reason> }` whenever we should not
 * fetch — callers must treat that as "enrich from CRM data only",
 * never as an error.
 */
export function deriveCompanyUrl(email: string | null | undefined): CompanyDomainResult {
  if (!email) return { url: null, domain: null, skipped: 'no-email' }

  const host = domainOf(email)
  if (!host) return { url: null, domain: null, skipped: 'malformed' }

  if (CONSUMER_MAIL_DOMAINS.has(host)) {
    return { url: null, domain: null, skipped: 'consumer-mailbox' }
  }
  if (DISPOSABLE_MAIL_DOMAINS.has(host)) {
    return { url: null, domain: null, skipped: 'disposable' }
  }

  const domain = registrableDomain(host)
  if (!domain) return { url: null, domain: null, skipped: 'public-suffix-only' }

  // A subdomain-derived registrable domain can still be a consumer
  // provider (e.g. "someone@mail.gmail.com"); re-check after reduction.
  if (CONSUMER_MAIL_DOMAINS.has(domain) || DISPOSABLE_MAIL_DOMAINS.has(domain)) {
    return { url: null, domain: null, skipped: 'consumer-mailbox' }
  }

  return { url: `https://${domain}`, domain }
}
