import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { abstractsTable } from "./abstracts";
import { speakersTable } from "./speakers";

export const programmeSessionsTable = pgTable("programme_sessions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  track: text("track").notNull().default("General"),
  room: text("room"),
  date: text("date"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isBreak: boolean("is_break").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  sessionType: text("session_type").notNull().default("presentation"),
  keyTakeaways: text("key_takeaways"),
  durationMinutes: integer("duration_minutes").notNull().default(45),
  status: text("status").notNull().default("draft"),
  internalNotes: text("internal_notes"),
  avRequirements: text("av_requirements"),
  abstractId: integer("abstract_id").references(() => abstractsTable.id),
  trackId: integer("track_id"),
  roomId: integer("room_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const sessionSpeakersTable = pgTable("session_speakers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => programmeSessionsTable.id, { onDelete: "cascade" }),
  speakerId: integer("speaker_id").references(() => speakersTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  jobTitle: text("job_title"),
  organization: text("organization"),
  roleInSession: text("role_in_session").default("Speaker"),
  photoObjectPath: text("photo_object_path"),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProgrammeSession = typeof programmeSessionsTable.$inferSelect;
export type SessionSpeaker = typeof sessionSpeakersTable.$inferSelect;
