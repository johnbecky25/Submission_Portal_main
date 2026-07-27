import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { abstractsTable } from "./abstracts";

export const abstractAttachmentsTable = pgTable("abstract_attachments", {
  id: serial("id").primaryKey(),
  abstractId: integer("abstract_id").notNull().references(() => abstractsTable.id),
  fileObjectPath: text("file_object_path").notNull(),
  fileOriginalName: text("file_original_name").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AbstractAttachment = typeof abstractAttachmentsTable.$inferSelect;
