import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { speakersTable } from "./speakers";

export const speakerMessagesTable = pgTable("speaker_messages", {
  id: serial("id").primaryKey(),
  speakerId: integer("speaker_id").notNull().references(() => speakersTable.id, { onDelete: "cascade" }),
  sentBy: text("sent_by").notNull().default("organizer"),
  subject: text("subject"),
  body: text("body"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type SpeakerMessage = typeof speakerMessagesTable.$inferSelect;
