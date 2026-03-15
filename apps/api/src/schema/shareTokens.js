// Drizzle ORM schema — share tokens for read-only song links
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";

export const shareTokens = pgTable("share_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),       // URL-safe random token
  songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  label: text("label"),                           // optional friendly name, e.g. "Sunday Team"
  expiresAt: timestamp("expires_at"),             // null = never expires
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
