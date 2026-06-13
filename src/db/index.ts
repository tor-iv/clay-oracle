// ── Database singleton ─────────────────────────────────────────────────────
// better-sqlite3 wrapped in drizzle with WAL mode + FK enforcement.
// Uses globalThis for hot-reload safety in Next.js dev server.

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";
import { DB_PATH } from "@/lib/constants";
import * as schema from "./schema";

// Ensure the data directory exists before opening the file.
mkdirSync(dirname(DB_PATH), { recursive: true });

function createDb() {
  const sqlite = new Database(DB_PATH);

  // WAL mode for better concurrent read performance.
  sqlite.pragma("journal_mode = WAL");
  // Enforce foreign key constraints.
  sqlite.pragma("foreign_keys = ON");

  // Bootstrap tables — CREATE IF NOT EXISTS mirrors the Drizzle schema exactly.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS pots (
      id          TEXT    PRIMARY KEY,
      shape       TEXT    NOT NULL,
      glaze       TEXT    NOT NULL,
      pattern     TEXT    NOT NULL,
      archetype_id TEXT   NOT NULL,
      reading     TEXT    NOT NULL,
      name        TEXT,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pots_created_at_idx ON pots (created_at);
  `);

  return drizzle(sqlite, { schema });
}

// Hot-reload guard: reuse the instance across HMR cycles.
declare global {
  // eslint-disable-next-line no-var
  var __clayOracleDb: ReturnType<typeof createDb> | undefined;
}

export const db: ReturnType<typeof createDb> =
  globalThis.__clayOracleDb ?? (globalThis.__clayOracleDb = createDb());

export { schema };
