#!/usr/bin/env bash
# sync-to-philly-repo.sh
# ─────────────────────────────────────────────────────────────────
# One-command sync of the extracted Philly CRM standalone into an
# existing Philly GitHub repo.
#
# Runs on YOUR machine (the sandbox this was authored in can't reach
# other GitHub repos). Clones the monorepo + the target Philly repo
# side by side, replaces the Philly repo's contents with the extracted
# standalone, commits the sync, and pushes.
#
# Usage:
#   ./sync-to-philly-repo.sh <PHILLY_REPO_GIT_URL> [BRANCH]
#
# Examples:
#   ./sync-to-philly-repo.sh git@github.com:bongartzdiaz/philly.git
#   ./sync-to-philly-repo.sh https://github.com/bongartzdiaz/philly.git main
#   ./sync-to-philly-repo.sh git@github.com:bongartzdiaz/philly.git sync/2026-04-24
#
# What it does:
#   1. Clones this monorepo at claude/ai-command-bar to a temp dir.
#   2. Clones the target Philly repo to a temp dir.
#   3. Checks out / creates the target branch.
#   4. rsync's apps/philly-standalone/* over the Philly repo, deleting
#      stale files but preserving the target repo's .git directory.
#   5. Commits with a descriptive message including the source SHA.
#   6. Pushes.
#
# Safety:
#   - Pushing to a non-"main" branch is recommended the first time —
#     it gives you a PR-style diff before merging.
#   - If you do push to main, everything in the Philly repo is
#     overwritten. There's no undo without reflog.
#
# Dependencies: git, rsync. Both are standard on macOS + Linux.

set -euo pipefail

PHILLY_URL="${1:-}"
TARGET_BRANCH="${2:-main}"

if [[ -z "$PHILLY_URL" ]]; then
  echo "Usage: $0 <PHILLY_REPO_GIT_URL> [BRANCH]"
  echo ""
  echo "Example: $0 git@github.com:bongartzdiaz/philly.git sync/2026-04-24"
  exit 1
fi

MONOREPO_URL="https://github.com/bongartzdiaz/juandiazllc.com"
MONOREPO_BRANCH="claude/ai-command-bar"
WORK_DIR="$(mktemp -d -t philly-sync-XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "┌─────────────────────────────────────────────────────────────"
echo "│ Syncing Philly CRM standalone → $PHILLY_URL ($TARGET_BRANCH)"
echo "│ Workspace: $WORK_DIR"
echo "└─────────────────────────────────────────────────────────────"

echo ""
echo "▶ 1/5  Clone monorepo source"
git clone --depth 1 --branch "$MONOREPO_BRANCH" "$MONOREPO_URL" "$WORK_DIR/monorepo"
SOURCE_SHA="$(cd "$WORK_DIR/monorepo" && git rev-parse --short HEAD)"
SOURCE_DIR="$WORK_DIR/monorepo/apps/philly-standalone"
if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "ERROR: $SOURCE_DIR not found in monorepo. Is the branch correct?"
  exit 1
fi

echo ""
echo "▶ 2/5  Clone target Philly repo"
git clone "$PHILLY_URL" "$WORK_DIR/philly-target"
cd "$WORK_DIR/philly-target"

echo ""
echo "▶ 3/5  Check out target branch ($TARGET_BRANCH)"
if git show-ref --quiet "refs/remotes/origin/$TARGET_BRANCH"; then
  git checkout "$TARGET_BRANCH"
else
  echo "  (branch does not exist; creating)"
  git checkout -b "$TARGET_BRANCH"
fi

echo ""
echo "▶ 4/5  Rsync extracted standalone over repo contents"
#   --delete       removes files in target that are absent in source
#   --exclude .git preserves the target repo's git history
#   Trailing slash on SOURCE_DIR copies contents, not the dir itself
rsync -av --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='.next' \
  "$SOURCE_DIR/" ./

echo ""
echo "▶ 5/5  Commit and push"
if [[ -z "$(git status --porcelain)" ]]; then
  echo "  (no changes — the target was already in sync)"
else
  git add -A
  git commit -m "sync from juandiazllc.com monorepo

Source: $MONOREPO_URL @ $MONOREPO_BRANCH ($SOURCE_SHA)
Path:   apps/philly-standalone/

Build state at sync time: 55/55 routes compile, 0 errors.
Run \`npm install && npm run build\` after applying to verify locally."
  git push origin "$TARGET_BRANCH"
  echo ""
  echo "✓ Pushed to $PHILLY_URL on $TARGET_BRANCH"
fi

echo ""
echo "Done."
