// Drizzle ORM schema — events (services, rehearsals, etc.)
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { setlists } from "./setlists.js";
import { users } from "./users.js";

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),             // e.g. "Sunday Morning Worship", "Wednesday Rehearsal"
  date: timestamp("date").notNull(),           // event date/time
  location: text("location"),                  // e.g. "Main Sanctuary", "Fellowship Hall"
  notes: text("notes"),                        // freeform notes
  organizationId: uuid("organization_id").references(() => organizations.id),
  setlistId: uuid("setlist_id").references(() => setlists.id), // optional linked setlist
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
