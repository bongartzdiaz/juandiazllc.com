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
