import { pgTable, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { abstractsTable } from "./abstracts";

export const reviewerAssignmentsTable = pgTable("reviewer_assignments", {
  abstractId: integer("abstract_id").notNull().references(() => abstractsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.abstractId, t.userId] })]);

export type ReviewerAssignment = typeof reviewerAssignmentsTable.$inferSelect;
