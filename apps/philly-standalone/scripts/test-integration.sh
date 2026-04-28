#!/usr/bin/env bash
# ---------------------------------------------------------------
# Run the cross-org integration suite against a real MariaDB.
# ---------------------------------------------------------------
# 1. Start docker/test-db (MariaDB on tmpfs, port 33306)
# 2. Wait for healthcheck
# 3. Run prisma migrate deploy
# 4. Run vitest with the integration glob
# 5. Leave the container running (faster iteration). Use
#    `docker compose -f docker/test-db/docker-compose.yml down`
#    to stop it.
# ---------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.." || { echo "could not cd to standalone root" >&2; exit 99; }

export DATABASE_URL="${DATABASE_URL:-mysql://philly:testpw@127.0.0.1:33306/philly_test}"
export ADMIN_MFA_ENFORCED="${ADMIN_MFA_ENFORCED:-false}"
export INTEGRATION_SECRET="${INTEGRATION_SECRET:-deadbeef-test-only-not-for-production-use-32b}"

echo "→ starting test MariaDB"
docker compose -f docker/test-db/docker-compose.yml up -d

echo "→ waiting for MariaDB healthcheck"
for _ in $(seq 1 60); do
  STATUS=$(docker compose -f docker/test-db/docker-compose.yml ps --format json test-mariadb 2>/dev/null | grep -oE '"Health":"[^"]+"' | head -1 | cut -d'"' -f4 || true)
  if [ "$STATUS" = "healthy" ]; then break; fi
  sleep 1
done
if [ "${STATUS:-unset}" != "healthy" ]; then
  echo "MariaDB never became healthy — abort"
  exit 1
fi

echo "→ applying schema with prisma migrate deploy"
node_modules/.bin/prisma migrate deploy

echo "→ running integration suite"
node_modules/.bin/vitest run --config vitest.integration.config.ts "$@"
