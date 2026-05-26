#!/usr/bin/env bash
# scripts/deus-extraction/extract.sh
# ──────────────────────────────────────────────────────────────────
# Performs the destructive subtree extraction:
#   apps/philly-standalone/  (in juandiazllc.com)
#         ↓ git filter-repo --subdirectory-filter ↓
#   /                         (root of DEUS-SHARED)
#
# DRY-RUN by default — pass --execute to actually run the destructive
# git filter-repo. Even with --execute this script operates on a FRESH
# CLONE per the EXTRACTION-PLAN.md safety note. It never touches your
# working repo.
#
# Prereqs:
#   - git filter-repo installed (pip install git-filter-repo)
#   - SSH or PAT access to bongartzdiaz/juandiazllc.com (read)
#   - SSH or PAT access to bongartzdiaz/DEUS-SHARED (write)
#   - You've read EXTRACTION-PLAN.md (./docs/operations/EXTRACTION-PLAN.md)
#
# Usage:
#   ./scripts/deus-extraction/extract.sh                    # dry-run
#   ./scripts/deus-extraction/extract.sh --execute          # actually run
#   ./scripts/deus-extraction/extract.sh --workdir=/tmp/x   # custom workdir

set -euo pipefail

# ── Args ──
EXECUTE=0
WORKDIR="${WORKDIR:-/tmp/deus-extraction-$(date +%s)}"
SRC_REPO="${SRC_REPO:-git@github.com:bongartzdiaz/juandiazllc.com.git}"
SUBDIR="${SUBDIR:-apps/philly-standalone}"

for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=1 ;;
    --workdir=*) WORKDIR="${arg#--workdir=}" ;;
    *) echo "Unknown arg: $arg"; exit 2 ;;
  esac
done

echo "DEUS extraction — $([ "$EXECUTE" = 1 ] && echo "EXECUTE" || echo "DRY-RUN") mode"
echo "  Source:   $SRC_REPO"
echo "  Subdir:   $SUBDIR"
echo "  Workdir:  $WORKDIR"
echo

if ! command -v git-filter-repo >/dev/null 2>&1; then
  if ! git filter-repo --help >/dev/null 2>&1; then
    echo "✗ git filter-repo not installed."
    echo "  Install: pip install git-filter-repo"
    echo "  Or:     brew install git-filter-repo"
    exit 1
  fi
fi

if [ -d "$WORKDIR" ]; then
  echo "✗ Workdir already exists: $WORKDIR"
  echo "  Pick a fresh path with --workdir=PATH or delete the existing one."
  exit 1
fi

echo "Step 1/4 — Fresh clone of source"
if [ "$EXECUTE" = 1 ]; then
  git clone --no-local "$SRC_REPO" "$WORKDIR"
  cd "$WORKDIR"
else
  echo "  would run: git clone --no-local $SRC_REPO $WORKDIR"
fi
echo

echo "Step 2/4 — Extract $SUBDIR/ as the new root via git filter-repo"
echo "  This is DESTRUCTIVE to the local clone — rewrites every commit."
echo "  Original repo on github.com/bongartzdiaz/juandiazllc.com is untouched."
if [ "$EXECUTE" = 1 ]; then
  git filter-repo --subdirectory-filter "$SUBDIR"
else
  echo "  would run: git filter-repo --subdirectory-filter $SUBDIR"
fi
echo

echo "Step 3/4 — Verify extraction"
echo "  After extraction, the workdir should contain only the standalone"
echo "  app files. Verify by listing top-level:"
if [ "$EXECUTE" = 1 ]; then
  ls -la
  echo
  echo "  Commit count after filter-repo: $(git rev-list --count HEAD)"
else
  echo "  would run: ls -la && git rev-list --count HEAD"
fi
echo

echo "Step 4/4 — Push to DEUS-SHARED"
echo "  WARNING: this overwrites DEUS-SHARED main with the extracted history."
echo "  Operator should tag the existing DEUS-SHARED main as 'pre-extraction-mirror'"
echo "  FIRST (manual step — see EXTRACTION-PLAN.md §5)."
if [ "$EXECUTE" = 1 ]; then
  git remote add deus-shared git@github.com:bongartzdiaz/DEUS-SHARED.git
  echo "  Remote added. Push manually after tagging the old main:"
  echo "    git push --force deus-shared main"
else
  echo "  would run: git remote add deus-shared git@github.com:bongartzdiaz/DEUS-SHARED.git"
  echo "  would NOT auto-push — manual operator step after tagging old main"
fi
echo

echo "── Done. Next steps:"
echo "  1. cd $WORKDIR"
echo "  2. Run scripts/deus-extraction/rename-philly.mjs --apply"
echo "  3. git mv lib/philly lib/deus (etc — see EXTRACTION-PLAN.md §3)"
echo "  4. Run scripts/deus-extraction/validate-rename.mjs"
echo "  5. Commit + push to deus-shared remote (force-push)"
