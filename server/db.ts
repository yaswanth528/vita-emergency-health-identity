import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from './env.js';

/* ============================================================================
   Database
   ----------------------------------------------------------------------------
   SQLite, because the subscription tier needs durable, transactional,
   relational state and this application previously had no database at all —
   adding a file-backed one is a smaller and more reversible step than adding
   a service to operate. The schema below is ordinary SQL and ports to Postgres
   without a rethink.

   Two things here are load-bearing rather than stylistic:

     - Money is INTEGER paise. SQLite's REAL would reintroduce the rounding
       problem the shared catalogue avoids.
     - The partial unique indexes are the duplicate-subscription guard. A user
       may hold at most one `active` row and at most one `pending` row, which
       is exactly enough to allow an in-flight upgrade while the current plan
       keeps working, and not enough to be billed twice for the same plan.
   ========================================================================== */

export type Db = Database.Database;

let db: Db | null = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  role         TEXT NOT NULL CHECK (role IN ('patient', 'clinician')),
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                  TEXT NOT NULL,
  status                   TEXT NOT NULL CHECK (
                             status IN ('active','pending','payment_failed','cancelled','expired')
                           ),
  payment_customer_id      TEXT,
  provider_subscription_id TEXT UNIQUE,
  provider_plan_id         TEXT,
  latest_payment_id        TEXT,
  amount                   INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'INR',
  billing_interval         TEXT NOT NULL DEFAULT 'monthly',
  start_date               TEXT,
  next_billing_date        TEXT,
  cancel_at_period_end     INTEGER NOT NULL DEFAULT 0,
  cancellation_date        TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);

-- The duplicate guard. One live plan, one plan change in flight, never two of either.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user
  ON subscriptions (user_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_pending_per_user
  ON subscriptions (user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS subscriptions_by_user ON subscriptions (user_id);

CREATE TABLE IF NOT EXISTS payments (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id          TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider_subscription_id TEXT,
  order_id                 TEXT,
  plan_id                  TEXT,
  amount                   INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'INR',
  status                   TEXT NOT NULL CHECK (status IN ('captured','failed','refunded')),
  method                   TEXT,
  description              TEXT,
  created_at               TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS payments_by_user ON payments (user_id, created_at DESC);

-- Webhook idempotency. The primary key IS the guarantee: a replayed delivery
-- fails to insert and is skipped before any subscription row is touched.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id     TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  received_at  TEXT NOT NULL,
  processed_at TEXT,
  status       TEXT NOT NULL CHECK (status IN ('processed','skipped','error')),
  note         TEXT
);
`;

export function getDb(): Db {
  if (db) return db;

  if (env.databaseUrl !== ':memory:') {
    fs.mkdirSync(path.dirname(env.databaseUrl), { recursive: true });
  }

  db = new Database(env.databaseUrl);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

/** Tests build a fresh in-memory database per suite. */
export function resetDbForTests(): Db {
  db?.close();
  db = null;
  return getDb();
}

export const nowIso = (): string => new Date().toISOString();

/** `2026-10-09` — the date half of an ISO timestamp, for billing dates. */
export const isoDate = (d: Date = new Date()): string => d.toISOString().slice(0, 10);
