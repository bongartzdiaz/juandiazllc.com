/* DEUS Help Center — article corpus.
 *
 * Plain TypeScript data so it's:
 *   - typed end-to-end (no CMS, no markdown rendering surface area)
 *   - greppable / git-versioned / reviewable in PRs
 *   - cheap to search in-memory (20 articles is nothing)
 *   - i18n-ready (titles + bodies are strings; future PR adds locale map)
 *
 * The same corpus powers both the full /philly/help page and the
 * floating drawer. Add an article = one entry here = it shows up in
 * both surfaces with no other wiring.
 *
 * Authoring notes:
 *   - Title: 5-9 words, question-shaped or imperative ("How do I…",
 *     "Connect your calendar"). Indexed for search.
 *   - Body: 1-3 short paragraphs (max ~120 words). Long answers belong
 *     in the steps array.
 *   - Steps: optional numbered list for procedural answers.
 *   - Tags: lowercase keywords for search beyond title/body matches.
 *
 * On scope: these answer the questions a customer asks in the FIRST
 * 30 days. Edge cases live in DEPLOY.md / MANUAL_TASKS.md / direct
 * email — that's what the "still stuck" footer is for.
 */

export type HelpCategoryKey =
  | 'getting-started'
  | 'calendar'
  | 'billing'
  | 'contacts-deals'
  | 'privacy'
  | 'troubleshooting'

export interface HelpCategory {
  key: HelpCategoryKey
  label: string
  description: string
}

export interface HelpArticle {
  /** Stable URL slug. Never change once published — bookmarks. */
  slug: string
  category: HelpCategoryKey
  title: string
  /** One-sentence summary, shown in lists. ≤140 chars. */
  summary: string
  /** Markdown-flavoured body. Renderer is intentionally minimal —
   *  paragraphs separated by blank lines, no headings, no embeds. */
  body: string
  /** Optional procedural steps. Rendered as <ol>. */
  steps?: string[]
  /** Free-form lowercase tags for search beyond title/body. */
  tags?: string[]
  /** Internal href on the same site, OR external https URL. */
  related?: Array<{ label: string; href: string }>
}

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    key: 'getting-started',
    label: 'Getting started',
    description: 'Your first hour in DEUS — set up the workspace and onboard your first contact.',
  },
  {
    key: 'calendar',
    label: 'Calendar sync',
    description: 'Connect Google or Outlook, see meetings on the contact page, troubleshoot sync.',
  },
  {
    key: 'billing',
    label: 'Billing & seats',
    description: 'Plans, trial, invoices, seat usage, the Stripe Customer Portal.',
  },
  {
    key: 'contacts-deals',
    label: 'Contacts & deals',
    description: 'Importing data, building pipelines, working with deals and notes.',
  },
  {
    key: 'privacy',
    label: 'Privacy & security',
    description: 'GDPR, exports, account deletion, audit log, where your data lives.',
  },
  {
    key: 'troubleshooting',
    label: 'Troubleshooting',
    description: "When something doesn't work — the fastest path to fixing it.",
  },
]

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Getting started ──────────────────────────────────────────────
  {
    slug: 'pick-your-industry',
    category: 'getting-started',
    title: 'Pick your industry',
    summary: 'The industry switcher seeds a starter pipeline tuned to operator workflows.',
    body:
      "DEUS ships pipelines for energy, real estate, hospitality, and adjacent operations. Picking your industry on first login seeds a stage list you can rebuild — it's a starting point, not a contract.\n\nYou can change your industry any time from the top-right switcher. Existing data isn't rewritten; only NEW pipelines you create afterwards inherit the new template.",
    steps: [
      'Click the industry switcher in the top-right of the dashboard.',
      'Pick the closest match. You can rebuild every stage afterwards.',
      'Open Pipelines → New to seed a pipeline with your industry template.',
    ],
    tags: ['industry', 'pipeline', 'template', 'first-login'],
  },
  {
    slug: 'invite-teammates',
    category: 'getting-started',
    title: 'Invite teammates',
    summary: 'Send role-based invites by email; seat counter shows used vs available.',
    body:
      'Invites are role-based (admin, manager, viewer) and single-use. The recipient sets their own password — you never see it. The seat counter on Settings → Team shows used vs available; if you need more seats, upgrade your plan first or the invite will be blocked.',
    steps: [
      'Go to Settings → Team.',
      'Enter their email, pick a role, click Send invite.',
      'They get a one-time link with a 7-day expiry.',
      'Watch the seat counter — pending invites count toward your limit.',
    ],
    tags: ['invite', 'team', 'seats', 'role', 'admin', 'manager', 'viewer'],
    related: [{ label: 'Billing & seats', href: '/philly/help/c/billing' }],
  },
  {
    slug: 'add-your-first-contact',
    category: 'getting-started',
    title: 'Add your first contact',
    summary: 'Use a real prospect, not a fake one — the dashboard tells you something the moment data is real.',
    body:
      "Don't seed a test account. DEUS is built for the operator who already has a pipeline; the first thing it should do is show you yours. Drop one real prospect in, attach them to a deal, and connect your calendar — meetings with that person will start appearing within seconds.",
    steps: [
      'Open Contacts → New.',
      'Paste a real prospect: name, email, company.',
      'Open Deals → New, attach them, pick a pipeline stage.',
      'Connect your calendar (Settings → Integrations) so meetings show up next to the deal.',
    ],
    tags: ['contact', 'deal', 'first', 'starter'],
  },
  {
    slug: 'csv-import-contacts',
    category: 'getting-started',
    title: 'Import contacts from a CSV',
    summary: 'Upload a CSV up to 5MB / 10 000 rows; the importer auto-maps common headers.',
    body:
      "DEUS auto-maps common headers (email, first_name, last_name, company, phone). Unrecognised columns default to 'skip' — you decide whether to import them. Duplicate emails inside the file or already in DEUS are skipped automatically.\n\nFormula-injection neutralisation: cells starting with =, +, -, or @ are stored with a leading apostrophe so a re-export to Excel can't trigger formula execution.",
    steps: [
      'Go to Contacts → Import.',
      'Drop your .csv file (max 5MB, 10 000 rows).',
      'Review the auto-mapped columns; adjust any that say "skip".',
      'Click Import. The progress bar shows live counts.',
    ],
    tags: ['csv', 'import', 'bulk', 'contacts', 'spreadsheet'],
  },
  {
    slug: 'onboarding-wizard',
    category: 'getting-started',
    title: 'Replay the onboarding wizard',
    summary: 'Re-open the 5-step wizard from Settings if you skipped or want to revisit.',
    body:
      "The wizard walks you through industry, organization profile, team, contacts, and calendar. If you skipped a step or want to revisit, it's available from Settings → Onboarding. Skipping is fine — none of the steps are required.",
    tags: ['wizard', 'onboarding', 'setup'],
  },

  // ── Calendar sync ────────────────────────────────────────────────
  {
    slug: 'connect-google-calendar',
    category: 'calendar',
    title: 'Connect Google Calendar',
    summary: 'OAuth flow takes ~10 seconds; read-only scope, no calendar writes.',
    body:
      "DEUS asks for read-only access to your primary calendar. We never write events back, never read your contacts, never see other Google services. Tokens are encrypted at rest with AES-256-GCM and decrypted only in-memory when we need them.",
    steps: [
      'Settings → Integrations → Connect Google Calendar.',
      'Grant the requested scopes — Calendar (read) and basic profile.',
      'You\'ll bounce back to DEUS with a green "Connected as you@yourcompany" badge.',
      'Push-sync starts immediately. Look for a "Real-time sync" badge confirming the channel is healthy.',
    ],
    tags: ['google', 'calendar', 'oauth', 'connect', 'sync'],
    related: [{ label: 'Calendar privacy posture', href: '/philly/help/calendar-art-9' }],
  },
  {
    slug: 'connect-outlook-calendar',
    category: 'calendar',
    title: 'Connect Outlook / Microsoft 365',
    summary: 'Same OAuth shape as Google; works with personal MSA or work/school accounts.',
    body:
      'Microsoft 365 uses Microsoft Graph subscriptions for push notifications. The subscription expires every 70 hours; DEUS auto-renews it. Both personal Microsoft accounts and work/school (Entra ID) tenants are supported.\n\nIf your tenant requires explicit URL allowlisting in Entra, your IT will need to whitelist the DEUS callback URL — message us and we\'ll send the exact strings.',
    steps: [
      'Settings → Integrations → Connect Microsoft Calendar.',
      'Sign in with your Microsoft account.',
      'Grant Calendars.Read + offline_access. We don\'t request write permissions in v1.',
      'You\'ll see "Connected as you@yourcompany.onmicrosoft.com" within 10 seconds.',
    ],
    tags: ['outlook', 'microsoft', 'office365', 'm365', 'entra', 'azure'],
  },
  {
    slug: 'meeting-not-showing',
    category: 'calendar',
    title: 'A meeting isn\'t showing on a contact',
    summary: 'DEUS only persists events whose attendees include a CRM contact.',
    body:
      "By design, DEUS only stores events whose attendee list includes at least one of your CRM contacts. This keeps your personal medical / political / private appointments out of the system. If a meeting isn't showing up, check three things in order:",
    steps: [
      'Is the contact\'s email on the meeting? Open the event in Google/Outlook and check the attendee list.',
      'Does the contact email in DEUS match the email on the calendar invite exactly? (case-insensitive but otherwise exact)',
      'Is the calendar still connected? Settings → Integrations should show a green "Real-time sync" badge.',
    ],
    tags: ['missing', 'meeting', 'sync', 'event', 'attendee'],
  },
  {
    slug: 'calendar-art-9',
    category: 'calendar',
    title: 'What we read from your calendar (and what we don\'t)',
    summary: 'Privacy-by-design: descriptions never persisted, non-CRM attendees dropped.',
    body:
      "We deliberately limit what we keep. Event descriptions are NEVER stored — they're the most likely place for medical, legal, or other Art. 9 special-category data. Attendees that aren't in your CRM are dropped before persistence. Events with no CRM attendee at all are counted but not stored.\n\nFor regulated verticals (healthcare, legal, financial), Settings → Privacy has a 'redact synced titles' toggle — when enabled, titles and locations are stored as one-way SHA-256 hashes instead of plaintext.",
    tags: ['privacy', 'gdpr', 'art-9', 'special-categories', 'medical', 'legal'],
    related: [{ label: 'Privacy & security overview', href: '/privacy' }],
  },

  // ── Billing & seats ──────────────────────────────────────────────
  {
    slug: 'start-free-trial',
    category: 'billing',
    title: 'Start the 14-day free trial',
    summary: 'No card up front; pick Starter or Professional and you\'re in.',
    body:
      'The trial is 14 days, no card required. You get every feature in your chosen plan during the trial. On day 14 you either add a card via the Stripe Customer Portal, or the workspace reverts to the free tier (3-seat cap, no calendar push-sync).',
    steps: [
      'Settings → Billing → Start free trial.',
      'Pick Starter (€49/seat/month) or Professional (€79/seat/month).',
      'You\'re redirected to Stripe Checkout. Email is pre-filled; no card needed for trial.',
      'Land back on Settings → Billing with "Trial ends in 14 days" visible.',
    ],
    tags: ['trial', 'starter', 'professional', 'plan', 'price', 'checkout'],
  },
  {
    slug: 'manage-billing-portal',
    category: 'billing',
    title: 'Update card or cancel via Customer Portal',
    summary: 'Stripe Customer Portal handles card updates, invoice history, and cancellations.',
    body:
      "Settings → Billing → Manage subscription opens the Stripe Customer Portal in a new tab. From there you can: update your card, change billing address, download past invoices (PDF), cancel at period end, or switch plans.\n\nWe never see your card details — Stripe is the system of record. Cancellations honour the current paid period (you keep access until the renewal date you skipped).",
    tags: ['cancel', 'card', 'invoice', 'stripe', 'portal'],
  },
  {
    slug: 'seat-counter-explained',
    category: 'billing',
    title: 'How the seat counter works',
    summary: 'Pending invites count too — that\'s why an invite can fail "no seats available".',
    body:
      "Used seats = active users + pending invites that haven't expired. If you're at the cap, revoke a pending invite or remove an inactive teammate before sending a new invite. The counter on Settings → Team shows used / limit / pending so you can see the breakdown.\n\nUpgrading your plan increases the cap immediately; downgrading takes effect at the end of the current billing period.",
    tags: ['seats', 'cap', 'limit', 'invite', 'upgrade'],
  },

  // ── Contacts & deals ────────────────────────────────────────────
  {
    slug: 'rebuild-pipeline-stages',
    category: 'contacts-deals',
    title: 'Rebuild your pipeline stages',
    summary: 'Industry templates are starting points — drag stages, rename, reorder freely.',
    body:
      "Open Pipelines → [your pipeline] → Edit stages. Drag to reorder, click to rename, the X removes a stage (deals in that stage move to the previous one). Stage colours are editable too — useful for distinguishing 'won' from 'in progress' visually.",
    tags: ['pipeline', 'stages', 'rebuild', 'edit', 'reorder'],
  },
  {
    slug: 'contact-vs-deal',
    category: 'contacts-deals',
    title: 'Contact vs deal — when to use which',
    summary: 'Contact = a person. Deal = a specific transaction. One contact can have many deals.',
    body:
      "A contact is a person (Maria at Acme Corp). A deal is a specific transaction with that contact (Q4 solar install). One contact often has multiple deals over time — DEUS keeps the contact stable while deals come and go through your pipeline. Notes can attach to either.",
    tags: ['contact', 'deal', 'difference', 'concept', 'data-model'],
  },
  {
    slug: 'tags-vs-pipelines',
    category: 'contacts-deals',
    title: 'Tags vs pipelines — when to use which',
    summary: 'Tags describe the contact (segment, source). Pipelines track movement (stage in a deal flow).',
    body:
      "Tags are static descriptors that don't change with workflow — 'investor', 'partner', 'press', 'inbound from LinkedIn'. They live on contacts.\n\nPipelines describe motion — a deal moves through stages over time. Use tags for slicing your contact list, pipelines for tracking deals in flight.",
    tags: ['tags', 'pipeline', 'difference', 'organize', 'segment'],
  },

  // ── Privacy & security ──────────────────────────────────────────
  {
    slug: 'export-my-data',
    category: 'privacy',
    title: 'Export all my data (GDPR Art. 15)',
    summary: 'One-click JSON export from Settings → Privacy. Sensitive credentials are stripped.',
    body:
      "Settings → Privacy → Export my data downloads a JSON archive with everything tied to your user (or your whole org if you're an admin). Sensitive credentials — password hash, 2FA secret, OAuth tokens, invite tokens — are explicitly omitted. The export shape is versioned (currently 1.2.0) so future schema changes don't break consumers.",
    steps: [
      'Settings → Privacy.',
      'Choose scope: My data (just you) or Organization data (admin/manager only).',
      'Click Export. The browser downloads a JSON file directly — nothing transits via email.',
    ],
    tags: ['gdpr', 'export', 'dsar', 'art-15', 'download', 'data'],
  },
  {
    slug: 'delete-my-account',
    category: 'privacy',
    title: 'Delete my account (GDPR Art. 17)',
    summary: 'Soft-delete with a 30-day window — fully reversible until the hard-delete fires.',
    body:
      "Settings → Privacy → Delete my account marks your account for deletion and immediately signs you out of every device. For 30 days you can email privacy@lucen.ai to reverse it; after 30 days the hard-delete cascades — all your contacts, deals, notes, audit history, calendar events permanently gone.\n\nLast-admin guardrail: if you're the only admin in an organization, you'll need to promote someone else first. We refuse to leave an org without an admin.",
    steps: [
      'Settings → Privacy → Delete my account.',
      'Type DELETE in the confirmation box.',
      'Confirm. You\'re signed out across every device.',
      '30 days later the hard-delete fires unless you email us to reverse it.',
    ],
    tags: ['delete', 'erasure', 'gdpr', 'art-17', 'account'],
  },
  {
    slug: 'where-data-lives',
    category: 'privacy',
    title: 'Where your data lives',
    summary: 'Supabase, Vercel, Stripe Ireland, Resend. AI enrichment runs at Anthropic in the US.',
    body:
      "Your data sits with our hosting and service providers: Supabase (database and authentication), Vercel (application hosting), Stripe Payments Europe Ltd in Ireland (payments) and Resend (email).\n\nOne processing step leaves the EEA: AI-assisted contact enrichment sends the contact's name, email, phone, company and notes to Anthropic in the United States. That is the only transfer of personal data to a third country in the product today.\n\nThe hosting region of each provider is being confirmed and will be published in the sub-processor list. Ask us and we will send you the current version.",
    tags: ['hosting', 'gdpr', 'data-residency', 'sub-processors', 'transfers'],
  },

  // ── Troubleshooting ────────────────────────────────────────────
  {
    slug: 'cant-log-in',
    category: 'troubleshooting',
    title: 'I can\'t log in',
    summary: 'Three quick checks before you email.',
    body:
      'Most login issues fall into one of three buckets, in order of likelihood:',
    steps: [
      'Wrong email — try the address you got the invite on. We\'re case-insensitive but otherwise exact.',
      'Forgot password — use the "Forgot password" link below the form. Resend window is 60 seconds; check spam.',
      'Account marked for deletion — if you started a delete in the last 30 days, the account is locked. Email privacy@lucen.ai to reverse it.',
    ],
    tags: ['login', 'password', 'access', 'locked', 'auth'],
  },
  {
    slug: 'csv-import-failed',
    category: 'troubleshooting',
    title: 'CSV import failed mid-way',
    summary: 'Most failures are encoding (UTF-8 only) or row count > 10 000.',
    body:
      'The importer rejects files in one of three cases: not UTF-8 encoded (re-save in Excel as "CSV UTF-8"), more than 10 000 data rows (split the file), or larger than 5MB. The error message tells you which one fired.\n\nIf it imported partially before failing, no harm done — duplicates on the second run are skipped automatically.',
    tags: ['csv', 'import', 'failed', 'encoding', 'utf-8', 'row-count'],
  },
  {
    slug: 'still-stuck',
    category: 'troubleshooting',
    title: 'Still stuck — talk to a human',
    summary: 'Email Juan directly. Real human, EU hours, response within one working day.',
    body:
      "If the answer isn't here, email **support@lucen.ai** — that lands in a real inbox, EU business hours (CET), reply within one working day. Include: what you tried, what you expected, what happened, and a screenshot if relevant. We're a small team — your message is read by someone who can fix it.",
    tags: ['contact', 'support', 'help', 'human', 'email'],
  },
]

/** In-memory search across title, summary, body, tags, and category
 *  label. Lowercase substring match — fast enough for ~20 articles
 *  without a real index, and predictable for users (no fuzzy "did you
 *  mean" rabbit holes). Returns articles ranked by where the match
 *  landed: title > tags > summary > body. */
export function searchArticles(query: string): HelpArticle[] {
  const q = query.trim().toLowerCase()
  if (!q) return HELP_ARTICLES
  const scored: Array<{ article: HelpArticle; score: number }> = []
  for (const article of HELP_ARTICLES) {
    let score = 0
    if (article.title.toLowerCase().includes(q)) score += 100
    if (article.tags?.some((t) => t.toLowerCase().includes(q))) score += 60
    if (article.summary.toLowerCase().includes(q)) score += 30
    if (article.body.toLowerCase().includes(q)) score += 10
    if (score > 0) scored.push({ article, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.article)
}

/** Lookup by slug. Returns undefined if not found. */
export function getArticle(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug)
}

/** Lookup by category. */
export function getArticlesInCategory(key: HelpCategoryKey): HelpArticle[] {
  return HELP_ARTICLES.filter((a) => a.category === key)
}
