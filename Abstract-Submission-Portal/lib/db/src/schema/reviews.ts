import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { abstractsTable } from "./abstracts";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  abstractId: integer("abstract_id").notNull().references(() => abstractsTable.id),
  reviewerId: integer("reviewer_id").notNull().references(() => usersTable.id),
  score: integer("score"),
  comments: text("comments"),
  recommendation: text("recommendation", { enum: ["accept", "accept_minor_review", "accept_major_review", "reject", "revise"] }),
  status: text("status", { enum: ["pending", "completed"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
