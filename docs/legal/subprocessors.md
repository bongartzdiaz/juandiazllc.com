# Sub-processors — Juan Diaz LLC

Sub-processors engaged in the delivery of **DEUS** (juandiazllc.com) and
**Diaz Editor** (diazatlas.com), as required by Art. 28(2) and Art. 28(4)
GDPR and disclosed under Art. 13(1)(e).

| | |
| --- | --- |
| Version | 0.1 |
| Last updated | 2026-07-26 |
| Status | **NOT YET PUBLISHED.** See §0 |
| Derived from | `docs/legal/verwerkingsregister.md` §3, itself built from the code as it stands on this date |

---

## §0 — Why this is not published yet

Two things must be settled first. Both are marked `[REGION TBC]` or
`[DPA TBC]` in the tables below rather than guessed.

**1. Hosting regions are not established.** They appear nowhere in the code.
The only way to determine them is to open each vendor dashboard. Until
that is done, no statement about data location can be published — not even
a cautious one.

> A previous draft of this document stated *"Hetzner Falkenstein, Germany"*
> and *"We do not transfer Personal Data outside the EEA."* That described a
> migration planned for 2026-05-15 that never took place, and the EEA claim
> was untrue regardless because of Anthropic. Both were removed from all
> live surfaces on 2026-07-26.

**2. No signed processing agreements were found.** Not one DPA artefact
exists in either repository. Every vendor below publishes a standard DPA;
none is confirmed as accepted or signed.

Until §0 is closed, this document is a working inventory — accurate about
*who* receives data and *what* they receive, incomplete about *where* and
*under what contract*.

---

## §1 — Active sub-processors

Verified as receiving personal data in the code as it runs today.

| Sub-processor | What it does | Personal data it receives | Region | DPA |
| --- | --- | --- | --- | --- |
| **Supabase** | Database, authentication, edge functions, file storage | Effectively all stored personal data on both surfaces | `[REGION TBC]` | `[DPA TBC]` |
| **Vercel** | Application hosting, cookieless web analytics | IP address and user-agent of every visitor | `[REGION TBC]` | `[DPA TBC]` |
| **Stripe Payments Europe Ltd** | Payment processing, VAT handling | Name, email, country, VAT details, amount | **Ireland** — verified from the contracting entity | [stripe.com/legal/dpa](https://stripe.com/legal/dpa) `[signature TBC]` |
| **Resend** | Transactional email, drip sequences | Email address, name, language, open and click events **including IP address** | `[REGION TBC]` | `[DPA TBC]` |
| **Anthropic PBC** | AI-assisted contact enrichment | Contact name, email, phone, company, contact type, lead source, up to 1,500 characters of notes | **United States** — `api.anthropic.com`, no EU endpoint configured | `[DPA TBC]` |
| **Plausible Insights OÜ** | Cookieless site analytics | No personal data stored. Visitor identifier is a hash of IP + user-agent, salted and rotated every 24 hours | Estonia — default `plausible.io` `[verify if self-hosted]` | [plausible.io/data-policy](https://plausible.io/data-policy) |
| **Google LLC** | OAuth sign-in, Calendar integration | Account identifier, calendar event titles, locations, attendee emails | United States — EU-US Data Privacy Framework, Google LLC certified | Google Cloud DPA `[signature TBC]` |
| **Microsoft** | OAuth sign-in, Calendar via Graph | Same categories as Google Calendar | `[REGION TBC]` | `[DPA TBC]` |
| **Telegram** | Instant notification on a new lead | The full lead: name, email, company, sector, source, message | `[REGION TBC]` — outside the EU | `[DPA TBC]` — **likely none available** |
| **Slack** | Error notifications from the application | Error URL and user-agent; no direct identifiers, but the URL may contain them | United States | `[DPA TBC]` |
| **Cloudflare** | Edge headers used for country detection and abuse prevention | IP address, country code | `[REGION TBC]` | `[DPA TBC]` |
| **Sentry** | Server-side error monitoring | No user identifiers — `setSentryUser` exists but is never called (verified) | `[REGION TBC]` — determined by the DSN | [sentry.io/legal/dpa](https://sentry.io/legal/dpa/) `[signature TBC]` |
| **GitHub (Microsoft)** | Auto-updater and release notes for the desktop app | IP address and application version on every start | United States | `[DPA TBC]` |
| **PDOK (Kadaster)** | Aerial imagery for the site-plan background | **The project address typed by the user**, converted to coordinates | Netherlands | Public service, no DPA `[verify]` |

⚠️ **Telegram deserves a second look.** `app/actions/contact.ts:43-57` pushes
the entire contact-form submission to `api.telegram.org`. Telegram does not
offer a standard processor agreement of the kind Art. 28(3) requires. If no
DPA can be obtained, this route should be replaced — email to yourself
achieves the same and stays within an existing processor.

---

## §2 — Conditional sub-processors

Present in the code, activated only when the corresponding environment
variable is configured. **Not active today** unless noted.

| Sub-processor | Activates when | What it would receive | Status |
| --- | --- | --- | --- |
| **Twilio** | `TWILIO_ACCOUNT_SID` set | Phone number, message content | `[verify if configured in production]` |
| **SendGrid** | provider selected in email config | Email address, name | `[verify]` |
| **Mailgun** | provider selected in email config | Email address, name | `[verify]` |
| **Mailchimp** | integration enabled | Email address, name | `[verify]` |
| **Intuit / QuickBooks** | OAuth connected | Invoice and customer data | `[verify]` |
| **Firecrawl** | `FIRECRAWL_API_KEY` set | Only the bare company domain — never a name, email or notes | **Deliberately off.** Held pending legal review of DPIA §1.2a |

---

## §3 — Inactive payment providers

Code is deployed but no payment path is wired to either site, and no
transaction has ever run through them. Listed for completeness.

| Provider | Status |
| --- | --- |
| **Paddle** (UK) | Edge function not deployed; `USE_PADDLE: false` on the site |
| **Lemon Squeezy** | Edge function deployed, but zero references on the site — no store connected |

---

## §4 — Transfers outside the EEA

| Recipient | Country | Mechanism |
| --- | --- | --- |
| Anthropic PBC | United States | `[TBC]` — no DPA artefact found; DPF certification status not established |
| Google LLC | United States | EU-US Data Privacy Framework — Google LLC is an active participant |
| Slack, GitHub | United States | `[TBC]` |
| Telegram | Outside the EU | `[TBC]` — no mechanism identified |
| Twilio, SendGrid, Mailgun | United States | `[TBC]`, and only if activated |

**Anthropic is the transfer that matters.** It is the only one that receives
substantive personal data — full contact records including free-text notes —
and it is not covered by any published statement today.

---

## §5 — Notification of changes

Customers will be notified before a new sub-processor is added or an
existing one replaced, in line with Art. 28(2). The notification period
still has to be set — 30 days is the common standard.

`[Mechanism TBC: email to the account contact, or a dated changelog on this page]`

---

## §6 — What has to happen before this is published

1. Open the Supabase, Resend, Sentry and MariaDB dashboards; record the region of each
2. Confirm which of §2 is actually configured in production
3. Accept or sign the DPA for each active sub-processor and record where it is filed
4. Establish Anthropic's transfer mechanism, or replace the processing
5. Decide on Telegram: obtain a DPA, or replace the route
6. Set the change-notification period and mechanism
7. Publish at `/legal/subprocessors` and link it from the privacy statement and the DPA

Only when 1 to 6 are done does this document meet Art. 28. Publishing it
before then would repeat the error it was written to correct: stating with
confidence something that has not been checked.
