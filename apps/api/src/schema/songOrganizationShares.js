// Drizzle ORM schema — organization-level song sharing
import { pgTable, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { songs } from "./songs.js";
import { users } from "./users.js";

export const songOrganizationShares = pgTable(
  "song_organization_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    sharedWithOrganizationId: uuid("shared_with_organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("song_organization_share_unique").on(table.songId, table.sharedWithOrganizationId),
  ]
);
