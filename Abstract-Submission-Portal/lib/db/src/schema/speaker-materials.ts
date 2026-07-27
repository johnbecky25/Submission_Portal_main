import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { speakersTable } from "./speakers";

export const speakerMaterialsTable = pgTable("speaker_materials", {
  id: serial("id").primaryKey(),
  speakerId: integer("speaker_id").notNull().references(() => speakersTable.id, { onDelete: "cascade" }),
  fileType: text("file_type"),
  originalFilename: text("original_filename"),
  storedFilename: text("stored_filename"),
  filePath: text("file_path"),
  fileSizeKb: integer("file_size_kb"),
  version: integer("version").notNull().default(1),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SpeakerMaterial = typeof speakerMaterialsTable.$inferSelect;
