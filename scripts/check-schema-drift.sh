#!/usr/bin/env bash
# Bundle CO — schema-drift gate.
#
# Catches the failure mode where a developer (me) edits
# `prisma/schema.prisma` to add a model/field/index but forgets to
# run `prisma migrate dev --create-only` — leaving the schema in
# HEAD that doesn't match what `migrate deploy` would apply on a
# fresh database. This is a real risk on the launch path: the next
# operator running migrations would silently get an out-of-sync DB.
#
# Heuristic: if a PR diff modifies any prisma/schema.prisma file,
# the same diff must also add at least one new file under
# prisma/migrations/. We compare against the merge-base with main
# so the check is local to *this* PR.
#
# Doesn't require a database — pure git diff.

set -euo pipefail

BASE_REF="${1:-origin/main}"

# Find the merge-base. Falls back to BASE_REF directly if we're on
# a detached commit (CI fetches main during checkout@v4).
MERGE_BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || echo "$BASE_REF")"

# All files changed in this PR.
CHANGED="$(git diff --name-only "$MERGE_BASE"..HEAD)"

EXIT_CODE=0
for SCHEMA in $(echo "$CHANGED" | grep -E '(^|/)prisma/schema\.prisma$' || true); do
  DIR="$(dirname "$SCHEMA")"
  MIGRATIONS_DIR="$DIR/migrations"

  # Did this PR add any new files under the matching migrations dir?
  NEW_MIGRATIONS="$(git diff --name-only --diff-filter=A "$MERGE_BASE"..HEAD -- "$MIGRATIONS_DIR/" || true)"

  if [ -z "$NEW_MIGRATIONS" ]; then
    echo "::error file=$SCHEMA::$SCHEMA was modified but no new migration files were added under $MIGRATIONS_DIR/. Run \`prisma migrate dev --create-only --name <change>\` and commit the new SQL."
    EXIT_CODE=1
  else
    echo "::notice file=$SCHEMA::Schema change has matching migration(s):"
    echo "$NEW_MIGRATIONS" | sed 's/^/  - /'
  fi
done

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "schema-drift check: clean"
fi

exit "$EXIT_CODE"
