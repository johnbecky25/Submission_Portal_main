import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const roomsTable = pgTable("conf_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity"),
  avEquipment: text("av_equipment"),
  setupType: text("setup_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Room = typeof roomsTable.$inferSelect;
