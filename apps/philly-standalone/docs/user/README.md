# Philly CRM — User documentation

This directory is the source-of-truth knowledge base for the in-app
AI assistant. Every file here:

- is plain Markdown with YAML frontmatter
- ships in four languages: `en/`, `nl/`, `de/`, `es/`
- is embedded by the build pipeline (`scripts/build-assistant-kb.ts`)
  into a vector index that the assistant retrieves from at chat time

If you add a new dashboard page, document it here. Undocumented
features become "I don't know" answers from the assistant; the doc
is part of the feature.

## Frontmatter contract

Every doc file MUST have frontmatter with these fields:

```markdown
---
slug: onboarding/create-org
lang: en
title: Create your organization
summary: How a new operator bootstraps a tenant on first sign-in.
tags: [onboarding, organization, admin]
related: [onboarding/invite-team, settings/users]
updated: 2026-04-25
---
```

The fields:

- **`slug`** — stable path-like identifier; never changes once
  published. Used for cross-linking and as the embedding key.
- **`lang`** — `en` | `nl` | `de` | `es`. Files in different
  languages share the same slug.
- **`title`** — one-line page title.
- **`summary`** — one-sentence summary that gets indexed and shown
  to the user as a citation when the assistant retrieves this doc.
- **`tags`** — flat list of topic tags. Used for faceted filtering.
- **`related`** — slugs of related docs. The assistant suggests
  these as follow-up reading.
- **`updated`** — ISO date of the last meaningful edit. Helps
  surface stale docs.

## Directory layout

```
docs/user/
├── README.md                    (this file)
├── en/
│   ├── onboarding/
│   │   ├── create-account.md
│   │   ├── create-organization.md
│   │   ├── invite-team.md
│   │   ├── ...
│   ├── features/
│   │   ├── contacts.md
│   │   ├── deals.md
│   │   ├── projects.md
│   │   ├── ...
│   └── concepts/
│       ├── tenancy.md
│       ├── roles.md
│       ├── gdpr.md
├── nl/   (mirrors en/)
├── de/   (mirrors en/)
└── es/   (mirrors en/)
```

## Translation discipline

1. Write the source file in `en/` first. The English version is
   authoritative; it lands first and triggers a translation task
   for the other locales.
2. Keep slugs identical across languages. The assistant uses the
   slug to retrieve the right-language version of the same doc.
3. Don't translate code blocks or env-var names. `INTEGRATION_SECRET`
   stays literal in every locale.
4. Keep the frontmatter `tags` and `related` lists identical
   across languages — they're keys, not display strings.

## Operator translation workflow (DeepL)

`scripts/translate-assistant-kb.ts` automates the en → nl/de/es
translation. It uses DeepL because (a) DeepL's nl/de/es quality
beats most alternatives for this kind of technical-but-readable
content, (b) the free tier (500k chars/month) covers the entire
KB across three languages with room to spare, and (c) the script
preserves frontmatter structure, code blocks, paths, and env-var
names without manual cleanup.

Run:

```bash
# Set your DeepL key (free tier ends in :fx; pro tier doesn't)
export DEEPL_API_KEY=your-deepl-key:fx

# Translate every en doc to all three target languages, skipping
# any that are already fresh (translation.updated >= en.updated)
npm run kb:translate

# Translate to a specific language only
npm run kb:translate -- --langs nl

# Re-translate one specific doc
npm run kb:translate -- --slug onboarding/welcome --force

# Preview without spending API credits
npm run kb:translate -- --dry-run
```

After translation: re-run `npm run kb:build` so the new
translations are embedded into the RAG index, then commit both
the markdown files and the regenerated `data/assistant-kb.json`.

`npm run kb:check` reports translation coverage. Set
`CHECK_KB_STRICT=1` to make CI fail when coverage isn't 100%.

### Hand-translating instead

For organisations with translators on staff, skip the script and
write the translation directly. The frontmatter contract is the
same — match the en source's `slug`, `tags`, `related`, and
`updated` fields verbatim; translate `title`, `summary`, and the
body. Don't translate paths (`/api/...`, `/settings/...`),
env-var names, or technical identifiers (`organizationId`,
`requireScope`, etc.).

## Two-way Obsidian sync

The KB plus the legal docs, runbook, GDPR records of processing,
PII registry, schema diagram, and API inventory all sync to an
Obsidian vault. Both directions:

```bash
# Export everything to the vault. Internal markdown links become
# Obsidian wikilinks; auto-generated notes (RoPA, PII, schema,
# API inventory) get rebuilt from the source.
npm run vault:export

# Pull edits back from the vault into docs/user/, docs/legal/,
# RUNBOOK. Auto-generated system/* notes are skipped on import
# (they're regenerated from code, never authoritative in the vault).
npm run vault:import

# Run both directions; mtime-newer wins on each file.
npm run vault:sync

# Dry-run — see what would change without writing anything.
npm run vault:check
```

By default the vault lives at `./obsidian-vault` (gitignored).
Point at your real vault directory by setting
`OBSIDIAN_VAULT_PATH=/path/to/your/vault` before running the
script.

The link transformer (`lib/vault/transform.ts`) is round-trip
identity-tested — the same doc passed through `toObsidian` then
`toMarkdown` is byte-identical to the original. So you can
freely edit notes in Obsidian and re-import without drift.

## Indexing

`scripts/build-assistant-kb.ts` walks this tree, chunks each file
(headings + ~400-token blocks), calls Ollama's embedding model
(`bge-m3` by default), and writes `data/assistant-kb.json` —
loaded into memory by `lib/assistant/rag.ts` at first request.

Re-run the script after adding or editing docs:

```bash
npm run kb:build
```

The CI step `npm run kb:check` verifies that every published `en/`
doc has translations in `nl/`, `de/`, `es/` and refuses to deploy
otherwise. (Until D-β — currently informational only.)
