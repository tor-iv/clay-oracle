// ── Database schema ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

export const pots = sqliteTable(
  "pots",
  {
    id:          text("id").primaryKey(),
    shape:       text("shape").notNull(),
    glaze:       text("glaze").notNull(),
    pattern:     text("pattern").notNull(),
    archetype_id: text("archetype_id").notNull(),
    reading:     text("reading").notNull(),
    name:        text("name"),
    created_at:  integer("created_at").notNull(),
  },
  (table) => [
    index("pots_created_at_idx").on(table.created_at),
  ]
);

export type Pot = InferSelectModel<typeof pots>;
