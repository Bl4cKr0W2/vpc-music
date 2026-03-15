// Drizzle ORM schema — song usage tracking (service history)
import { pgTable, text, timestamp, uuid, date } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";
import { organizations } from "./organizations.js";
import { events } from "./events.js";

export const songUsages = pgTable("song_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
  usedAt: date("used_at").notNull(),                   // the date the song was used/played
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),  // optional link to event
  notes: text("notes"),                                 // e.g. "Sunday morning service"
  organizationId: uuid("organization_id").references(() => organizations.id),
  recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});
