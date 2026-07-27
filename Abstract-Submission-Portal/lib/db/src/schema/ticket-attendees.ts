import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ticketSyncsTable = pgTable("ticket_syncs", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  emailCol: text("email_col").notNull(),
  nameCol: text("name_col").notNull().default(""),
  ticketTypeCol: text("ticket_type_col").notNull().default(""),
  statusCol: text("status_col").notNull().default(""),
  paymentStatusCol: text("payment_status_col").notNull().default(""),
  driveUrl: text("drive_url").notNull().default(""),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  syncedBy: integer("synced_by"),
});

export const ticketAttendeesTable = pgTable("ticket_attendees", {
  id: serial("id").primaryKey(),
  syncId: integer("sync_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull().default(""),
  ticketType: text("ticket_type").notNull().default(""),
  registrationStatus: text("registration_status").notNull().default(""),
  paymentStatus: text("payment_status").notNull().default(""),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTicketSyncSchema = createInsertSchema(ticketSyncsTable).omit({ id: true, syncedAt: true });
export type InsertTicketSync = z.infer<typeof insertTicketSyncSchema>;
export type TicketSync = typeof ticketSyncsTable.$inferSelect;

export const insertTicketAttendeeSchema = createInsertSchema(ticketAttendeesTable).omit({ id: true, createdAt: true });
export type InsertTicketAttendee = z.infer<typeof insertTicketAttendeeSchema>;
export type TicketAttendee = typeof ticketAttendeesTable.$inferSelect;
