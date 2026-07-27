import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const zohoConfigTable = pgTable("zoho_config", {
  id: serial("id").primaryKey(),
  portalSlug: text("portal_slug").notNull(),
  eventId: text("event_id").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  zohoDomain: text("zoho_domain").notNull().default("zoho.com"),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  webhookToken: text("webhook_token"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
});

export type ZohoConfig = typeof zohoConfigTable.$inferSelect;
