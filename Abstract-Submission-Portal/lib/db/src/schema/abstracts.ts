import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const abstractsTable = pgTable("abstracts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  track: text("track").notNull(),
  keywords: text("keywords"),
  country: text("country"),
  salutation: text("salutation"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  organization: text("organization"),
  designation: text("designation"),
  phone: text("phone"),
  status: text("status", {
    enum: ["draft", "submitted", "under_review", "accepted", "rejected", "on_hold"],
  }).notNull().default("draft"),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  fileObjectPath: text("file_object_path"),
  fileOriginalName: text("file_original_name"),
  adminFeedbackFileObjectPath: text("admin_feedback_file_object_path"),
  adminFeedbackFileName: text("admin_feedback_file_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAbstractSchema = createInsertSchema(abstractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAbstract = z.infer<typeof insertAbstractSchema>;
export type Abstract = typeof abstractsTable.$inferSelect;
