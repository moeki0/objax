/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const things = pgTable("things", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  users: jsonb("users").$type<any[] | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type DbThing = typeof things.$inferSelect;

export const GLOBAL_STATE_ID = "global";
