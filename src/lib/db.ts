import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";

export type Db = Database.Database;

/** Open a database (use ":memory:" for tests) and make sure the schema exists. */
export function createDb(file: string): Db {
  if (file !== ":memory:")
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

const globalForDb = globalThis as unknown as { __creatorhubDb?: Db };

/** Process-wide singleton (survives Next.js hot reloads in dev). */
export function getDb(): Db {
  if (!globalForDb.__creatorhubDb) {
    globalForDb.__creatorhubDb = createDb(
      process.env.DATABASE_PATH ?? "data/creatorhub.db",
    );
  }
  return globalForDb.__creatorhubDb;
}

/** Test helper: close and forget the singleton so the next getDb() starts fresh. */
export function resetDb() {
  globalForDb.__creatorhubDb?.close();
  globalForDb.__creatorhubDb = undefined;
}
