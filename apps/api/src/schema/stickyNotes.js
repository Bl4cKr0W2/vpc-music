// Drizzle ORM schema — sticky notes (personal annotations on songs)
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const stickyNotes = pgTable("sticky_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id),
  content: text("content").notNull(),       // markdown text content
  color: text("color").default("yellow"),   // yellow, blue, green, pink, purple
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
