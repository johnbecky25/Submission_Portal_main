import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { abstractsTable } from "./abstracts";

export const speakersTable = pgTable("speakers", {
  id: serial("id").primaryKey(),
  abstractId: integer("abstract_id").references(() => abstractsTable.id).unique(),
  speakerNumber: integer("speaker_number").unique(),
  callCategory: text("call_category"),
  name: text("name").notNull(),
  organization: text("organization"),
  jobTitle: text("job_title"),
  email: text("email").notNull(),
  phone: text("phone"),
  gender: text("gender"),
  country: text("country"),
  photoObjectPath: text("photo_object_path"),
  biography: text("biography"),
  presentationTitle: text("presentation_title"),
  materialObjectPath: text("material_object_path"),
  materialOriginalName: text("material_original_name"),
  lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
  portalToken: text("portal_token").unique(),
  status: text("status").notNull().default("invited"),
  dietaryRequirements: text("dietary_requirements"),
  accessibilityNeeds: text("accessibility_needs"),
  recordingConsent: boolean("recording_consent").notNull().default(false),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Speaker = typeof speakersTable.$inferSelect;
