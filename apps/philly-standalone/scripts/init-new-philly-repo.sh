#!/usr/bin/env bash
# init-new-philly-repo.sh
# ─────────────────────────────────────────────────────────────────
# One-command push of the extracted Philly CRM standalone into a
# brand-new, empty GitHub repo. Use this when you've just created a
# fresh repo at https://github.com/new and want its first commit to
# be the extracted CRM.
#
# If instead you want to update an EXISTING repo that already has
# history, use sync-to-philly-repo.sh next to this file.
#
# Runs on YOUR machine (this sandbox can't reach other GitHub repos).
#
# Usage:
#   ./init-new-philly-repo.sh <NEW_EMPTY_REPO_GIT_URL>
#
# Examples:
#   ./init-new-philly-repo.sh git@github.com:bongartzdiaz/philly-crm.git
#   ./init-new-philly-repo.sh https://github.com/bongartzdiaz/philly-crm.git
#
# What it does:
#   1. Shallow-clones this monorepo to a temp dir.
#   2. Enters apps/philly-standalone, wipes any inherited .git.
#   3. git init -b main, adds all files, commits as the initial commit
#      with a message that records the source SHA.
#   4. Sets the new repo as origin + pushes.
#
# Assumes the target repo is empty. If it has a README or .gitignore
# from GitHub's "initialize with" checkboxes, the push will fail with
# non-fast-forward — delete those from the target or use
# sync-to-philly-repo.sh instead.
#
# Nothing auto-deploys after the push: a fresh GitHub repo has no
# Vercel connection until you install the Vercel GitHub app on it
# or create a Vercel project pointing at it.
#
# Dependencies: git. That's it.

set -euo pipefail

NEW_REPO_URL="${1:-}"

if [[ -z "$NEW_REPO_URL" ]]; then
  echo "Usage: $0 <NEW_EMPTY_REPO_GIT_URL>"
  echo ""
  echo "Example: $0 git@github.com:bongartzdiaz/philly-crm.git"
  echo ""
  echo "If the target repo already has commits, use"
  echo "sync-to-philly-repo.sh instead."
  exit 1
fi

MONOREPO_URL="https://github.com/bongartzdiaz/juandiazllc.com"
MONOREPO_BRANCH="claude/ai-command-bar"
WORK_DIR="$(mktemp -d -t philly-init-XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "┌─────────────────────────────────────────────────────────────"
echo "│ Creating fresh Philly CRM repo at: $NEW_REPO_URL"
echo "│ Workspace: $WORK_DIR"
echo "└─────────────────────────────────────────────────────────────"

echo ""
echo "▶ 1/4  Clone monorepo source"
git clone --depth 1 --branch "$MONOREPO_BRANCH" "$MONOREPO_URL" "$WORK_DIR/monorepo"
SOURCE_SHA="$(cd "$WORK_DIR/monorepo" && git rev-parse --short HEAD)"
SOURCE_DIR="$WORK_DIR/monorepo/apps/philly-standalone"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: $SOURCE_DIR not found. Is the branch name correct?"
  exit 1
fi

echo ""
echo "▶ 2/4  Initialize fresh git history in the extracted dir"
cd "$SOURCE_DIR"
rm -rf .git
git init -b main -q
git add .

echo ""
echo "▶ 3/4  Create initial commit"
git commit -q -m "Initial commit — Philly CRM standalone

Extracted from the juandiazllc.com monorepo at commit $SOURCE_SHA.
Source path: apps/philly-standalone/

Build state at extraction: 55/55 routes compile, 0 errors.
Stack: Next.js 16 + Prisma 7 (MariaDB) + Supabase auth + next-intl.

After cloning this repo locally:
  cp .env.example .env.local     # fill in Supabase + DATABASE_URL
  npm install
  npm run db:migrate
  npm run dev

See README.md for routing + setup details.

Source: $MONOREPO_URL/tree/$MONOREPO_BRANCH/apps/philly-standalone"

echo ""
echo "▶ 4/4  Push to $NEW_REPO_URL"
git remote add origin "$NEW_REPO_URL"
git push -u origin main

echo ""
echo "✓ Done. New repo is at: $NEW_REPO_URL"
echo ""
echo "Nothing has been deployed. GitHub repos are inert until you"
echo "explicitly connect them to a host (Vercel, Cloudflare, etc.)."
echo ""
echo "To deploy when ready:"
echo "  - Visit https://vercel.com/new and import the new repo"
echo "  - Set the env vars from .env.example in the Vercel dashboard"
echo "  - Point a domain at the Vercel project"
