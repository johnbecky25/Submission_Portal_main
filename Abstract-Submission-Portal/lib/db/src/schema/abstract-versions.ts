import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { abstractsTable } from "./abstracts";

export const abstractVersionsTable = pgTable("abstract_versions", {
  id: serial("id").primaryKey(),
  abstractId: integer("abstract_id").notNull().references(() => abstractsTable.id),
  version: integer("version").notNull().default(1),
  title: text("title").notNull(),
  content: text("content"),
  track: text("track").notNull(),
  keywords: text("keywords"),
  country: text("country"),
  snapshotReason: text("snapshot_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AbstractVersion = typeof abstractVersionsTable.$inferSelect;
