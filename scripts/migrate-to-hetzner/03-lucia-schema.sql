-- 03-lucia-schema.sql
-- What this does:
--   Creates the Lucia v3 user + session tables in the lucia_auth DB,
--   plus a separate auth_oauth_account table for Google + Microsoft
--   provider linkage. Schema follows the Lucia v3 docs convention
--   (https://lucia-auth.com/database/postgresql).
--
-- Run as lucia_app (or as postgres) with:
--   sudo -u postgres psql -d lucia_auth -f 03-lucia-schema.sql
--
-- Idempotent — uses CREATE TABLE IF NOT EXISTS.

\set ON_ERROR_STOP on
\connect lucia_auth

-- ============================================================
-- auth_user — primary user record. Lucia v3 expects an id (text).
-- We add the columns DEUS needs: email, names, bcrypt_legacy
-- (for migrating Supabase bcrypt hashes), the new argon2id hash,
-- email_verified flag, timestamps, and a soft-delete column to
-- match the existing Prisma User soft-delete pattern.
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_user (
  id                TEXT PRIMARY KEY,
  email             CITEXT NOT NULL,
  -- argon2id hash of the password; NULL for users who only OAuth.
  password_hash     TEXT,
  -- legacy bcrypt hash from Supabase Auth, populated by 05-import.
  -- NULL'd on first successful login (lazy-rehash to argon2id).
  bcrypt_legacy     TEXT,
  email_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  -- mirrors Prisma User.deletedAt — DSAR / Art. 17 erasure window.
  deleted_at        TIMESTAMPTZ,
  -- last successful login (for inactivity reports).
  last_sign_in_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- citext extension for case-insensitive email
CREATE EXTENSION IF NOT EXISTS citext;

CREATE UNIQUE INDEX IF NOT EXISTS auth_user_email_key
  ON auth_user (email)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS auth_user_deleted_at_idx
  ON auth_user (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ============================================================
-- auth_session — Lucia session storage.
-- Lucia v3 calls this 'user_session' by convention; we prefix
-- 'auth_' to keep it adjacent to auth_user in dumps + grep.
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_session (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  -- audit columns
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_inet     INET,
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS auth_session_user_id_idx
  ON auth_session (user_id);

CREATE INDEX IF NOT EXISTS auth_session_expires_at_idx
  ON auth_session (expires_at);

-- ============================================================
-- auth_oauth_account — links a user to a provider account.
-- One row per (provider, provider_user_id). A user can have
-- multiple rows (Google + Microsoft + email).
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_oauth_account (
  user_id           TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  provider          TEXT NOT NULL,           -- 'google' | 'microsoft'
  provider_user_id  TEXT NOT NULL,           -- the 'sub' / oid claim
  provider_email    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS auth_oauth_account_user_id_idx
  ON auth_oauth_account (user_id);

-- ============================================================
-- updated_at trigger on auth_user
-- ============================================================
CREATE OR REPLACE FUNCTION auth_user_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auth_user_updated_at ON auth_user;
CREATE TRIGGER auth_user_updated_at
  BEFORE UPDATE ON auth_user
  FOR EACH ROW
  EXECUTE FUNCTION auth_user_set_updated_at();

-- ============================================================
-- ro grants now that tables exist
-- ============================================================
GRANT SELECT ON ALL TABLES IN SCHEMA public TO lucia_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO lucia_ro;

\echo 'OK: lucia v3 schema created (auth_user + auth_session + auth_oauth_account).'
