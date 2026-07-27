import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { abstractsTable } from "./abstracts";

export const formFieldsTable = pgTable("form_fields", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type", {
    enum: ["text", "number", "dropdown", "checkbox", "textarea"],
  }).notNull(),
  options: jsonb("options").$type<string[]>(),
  required: boolean("required").notNull().default(false),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FormField = typeof formFieldsTable.$inferSelect;
export type InsertFormField = typeof formFieldsTable.$inferInsert;

export const abstractFieldValuesTable = pgTable("abstract_field_values", {
  id: serial("id").primaryKey(),
  abstractId: integer("abstract_id").notNull().references(() => abstractsTable.id, { onDelete: "cascade" }),
  fieldId: integer("field_id").notNull().references(() => formFieldsTable.id, { onDelete: "cascade" }),
  value: text("value"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AbstractFieldValue = typeof abstractFieldValuesTable.$inferSelect;
export type InsertAbstractFieldValue = typeof abstractFieldValuesTable.$inferInsert;
