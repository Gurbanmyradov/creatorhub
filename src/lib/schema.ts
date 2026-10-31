export const PLATFORMS = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "twitch",
  "linkedin",
  "other",
] as const;
export type Platform = (typeof PLATFORMS)[number];
export const CAMPAIGN_STATUSES = [
  "draft",
  "active",
  "completed",
  "cancelled",
] as const;
export const PARTNERSHIP_STATUSES = [
  "proposed",
  "agreed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export const DELIVERABLE_TYPES = [
  "post",
  "story",
  "reel",
  "video",
  "blog",
  "other",
] as const;
export const DELIVERABLE_STATUSES = [
  "pending",
  "submitted",
  "approved",
  "changes_requested",
] as const;

const list = (values: readonly string[]) =>
  values.map((v) => `'${v}'`).join(", ");

/** Idempotent DDL. Money is stored as integer cents; dates as ISO `YYYY-MM-DD`. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS creators (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone       TEXT,
  niche       TEXT NOT NULL DEFAULT 'general',
  country     TEXT,
  bio         TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS creator_platforms (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id      INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN (${list(PLATFORMS)})),
  handle          TEXT NOT NULL,
  followers       INTEGER NOT NULL CHECK (followers >= 0),
  engagement_rate REAL NOT NULL CHECK (engagement_rate >= 0 AND engagement_rate <= 100),
  UNIQUE (creator_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_platforms_platform ON creator_platforms(platform);

CREATE TABLE IF NOT EXISTS campaigns (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  brand        TEXT NOT NULL,
  description  TEXT,
  budget_cents INTEGER NOT NULL CHECK (budget_cents >= 0),
  start_date   TEXT NOT NULL,
  deadline     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (${list(CAMPAIGN_STATUSES)})),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (deadline >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Deleting a creator that still has partnerships is blocked (RESTRICT);
-- deleting a campaign removes its partnerships and deliverables (CASCADE).
CREATE TABLE IF NOT EXISTS partnerships (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id    INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id     INTEGER NOT NULL REFERENCES creators(id) ON DELETE RESTRICT,
  fee_cents      INTEGER NOT NULL CHECK (fee_cents >= 0),
  status         TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (${list(PARTNERSHIP_STATUSES)})),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN (${list(PAYMENT_STATUSES)})),
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (campaign_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_partnerships_creator ON partnerships(creator_id);

CREATE TABLE IF NOT EXISTS deliverables (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  partnership_id INTEGER NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'post' CHECK (type IN (${list(DELIVERABLE_TYPES)})),
  due_date       TEXT,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (${list(DELIVERABLE_STATUSES)})),
  feedback       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_deliverables_partnership ON deliverables(partnership_id);
`;
