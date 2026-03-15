// Drizzle ORM schema — song edit history (audit trail)
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";

export const songEdits = pgTable("song_edits", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  editedBy: uuid("edited_by").references(() => users.id, { onDelete: "set null" }),
  field: text("field").notNull(),         // e.g. "title", "content", "key", "tempo", etc.
  oldValue: text("old_value"),            // previous value (null for initial create)
  newValue: text("new_value"),            // updated value
  createdAt: timestamp("created_at").defaultNow(),
});
