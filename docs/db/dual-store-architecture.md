# Two data stores, one data subject

This project persists personal data in **two separate databases**. That
is deliberate, but it is not obvious from the code, and getting it wrong
has legal consequences rather than merely functional ones.

| Store | Reached via | Holds |
| --- | --- | --- |
| **MariaDB** | Prisma (`getAuthPrisma()`, `lib/philly/auth.ts`) | The DEUS CRM: `User`, `Contact`, `Deal`, `AuditLog`, calendar sync, GDPR logs |
| **Supabase Postgres** | `@supabase/supabase-js` (`lib/supabase/*`) | Public marketing forms (`leads`, `subscribers`), Supabase Auth, PhilanthropyAI (`pai_*`), plus a partial copy of the CRM schema |

Both are in active use, for different purposes. Neither is being
retired as of 2026-07-21.

## Why this needs care

A data subject does not know or care that you run two databases. Under
GDPR they have one identity and one set of rights:

- **Art. 15 (access)** — an export must cover *both* stores, or you are
  telling someone "this is everything we hold" while omitting half.
- **Art. 17 (erasure)** — a purge must delete from *both*, or you are
  certifying a deletion that did not happen. This is the more serious
  direction: an incomplete export can be corrected, an incorrectly
  certified erasure cannot.

Until 2026-07-21 both paths read only MariaDB. `leads` and `subscribers`
were covered by nothing at all.

## How the two are joined

They share no foreign key. The only link is the **email address**:

- CRM rows key on `userId` / `organizationId`
- Marketing rows are anonymous at write time and carry only the email
  the visitor typed

So `lib/philly/dsar-marketing.ts` matches on exact, lowercased email.
Deliberately **not** fuzzy: no plus-address stripping, no domain
matching. Over-matching would return or delete a different person's
data, which is a worse failure than under-matching. A submission made
with an address the account does not use will not be found — correct,
since there is no basis to link them.

## Rules when touching this

1. **Adding a table that holds personal data?** Decide which store it
   belongs to, then wire it into `lib/philly/dsar.ts` (access) *and*
   `lib/philly/user-purge.ts` (erasure). A table in neither is a
   compliance gap that will not surface until someone exercises a right.
2. **Purging on the marketing side keys on email**, so capture
   addresses *before* anonymization overwrites them. `user-purge.ts`
   does this via `emailsToPurge`; if you reorder that function, keep it.
3. **Never report a partial erasure as success.** `purgeMarketingData`
   returns `available: false` when the store is unreachable, and
   `POST /philly/api/users/cron/hard-purge` returns 500 in that case so
   the scheduler retries and alerting fires. The CRM half is idempotent,
   so retrying is safe.
4. **The DSAR manifest declares its own gaps** —
   `marketing_store_included: false` plus a warning in `notice` when the
   marketing store could not be read. Do not remove that in favour of a
   silent empty array.

## Open question

The Supabase Postgres copy of the CRM schema (`Contact`, `User`,
`Organization`, `AuditLog`, …) had rows written as recently as
2026-07-12. It is **not** covered by the DSAR or purge paths, which
target MariaDB.

If that copy is live, it needs the same treatment as the marketing
tables. If it is a stale snapshot, it holds personal data past its
purpose and should be dropped — keeping it is a storage-limitation
problem in its own right.

Resolve before onboarding customer #2.
