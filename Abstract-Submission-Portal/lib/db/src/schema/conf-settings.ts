import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const programmeSettingsTable = pgTable("programme_settings", {
  id: serial("id").primaryKey(),
  eventName: text("event_name").notNull().default("Africa Water Systems Conference"),
  eventDates: text("event_dates"),
  eventVenue: text("event_venue"),
  materialsDeadline: text("materials_deadline"),
  isProgrammePublic: boolean("is_programme_public").notNull().default(false),
  messageNotificationEmails: text("message_notification_emails"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProgrammeSetting = typeof programmeSettingsTable.$inferSelect;
