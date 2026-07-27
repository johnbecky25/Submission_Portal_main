import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const tracksTable = pgTable("conf_tracks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#534AB7"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Track = typeof tracksTable.$inferSelect;
