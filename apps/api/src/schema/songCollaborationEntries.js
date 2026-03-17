// Drizzle ORM schema — song collaboration threads, rehearsal markers, and notes
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

export const songCollaborationEntries = pgTable("song_collaboration_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  parentId: uuid("parent_id"),
  type: text("type").notNull(), // comment | rehearsal_marker | rehearsal_note
  anchor: text("anchor"),
  title: text("title"),
  content: text("content").notNull(),
  status: text("status").default("open"), // open | resolved
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});