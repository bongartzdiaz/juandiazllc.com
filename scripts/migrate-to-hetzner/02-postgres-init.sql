-- 02-postgres-init.sql
-- What this does:
--   Creates the lucia_auth database, the lucia_app role (owner of the
--   Lucia tables), and a lucia_ro role for read-only ops queries.
--   Designed to run as the postgres superuser via:
--     sudo -u postgres psql -f 02-postgres-init.sql
--
-- Idempotent — safe to re-run.

\set ON_ERROR_STOP on

-- App role (used by the Next.js app via LUCIA_DATABASE_URL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_app') THEN
    -- placeholder password; operator MUST rotate this immediately:
    --   ALTER ROLE lucia_app WITH PASSWORD '<strong-random>';
    -- and put the new value in LUCIA_DATABASE_URL.
    CREATE ROLE lucia_app
      WITH LOGIN
           PASSWORD 'change-me-on-first-run'
           NOSUPERUSER
           NOCREATEDB
           NOCREATEROLE
           NOREPLICATION
           CONNECTION LIMIT 50;
  END IF;
END
$$;

-- Read-only role (handy for ad-hoc ops queries)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lucia_ro') THEN
    CREATE ROLE lucia_ro
      WITH LOGIN
           PASSWORD 'change-me-on-first-run'
           NOSUPERUSER
           NOCREATEDB
           NOCREATEROLE
           NOREPLICATION
           CONNECTION LIMIT 5;
  END IF;
END
$$;

-- Database
SELECT 'CREATE DATABASE lucia_auth OWNER lucia_app ENCODING ''UTF8'' LC_COLLATE ''C.UTF-8'' LC_CTYPE ''C.UTF-8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'lucia_auth')
\gexec

-- Connect into it for table-level grants (run after 03-lucia-schema.sql
-- creates the tables — see end of this file for the GRANTs we issue
-- once the schema exists).
\connect lucia_auth

-- Schema-level: keep everything in 'public' for simplicity. lucia_app
-- already owns the DB so future CREATE TABLE works.
GRANT CONNECT ON DATABASE lucia_auth TO lucia_ro;
GRANT USAGE ON SCHEMA public TO lucia_ro;

-- The actual tables are created by 03-lucia-schema.sql. After that
-- runs, the operator should re-run the next block manually OR run:
--   psql -d lucia_auth -c "GRANT SELECT ON ALL TABLES IN SCHEMA public TO lucia_ro;"
--   psql -d lucia_auth -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO lucia_ro;"
-- (We don't issue these here because the tables don't exist yet.)

\echo 'OK: lucia_auth DB + roles created. Now run 03-lucia-schema.sql as lucia_app.'
\echo 'NEXT: ALTER ROLE lucia_app WITH PASSWORD ''<strong-random>''; and update LUCIA_DATABASE_URL.'
