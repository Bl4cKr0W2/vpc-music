// Drizzle ORM schema — direct authenticated song sharing
import { pgTable, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { songs } from "./songs.js";
import { users } from "./users.js";

export const songUserShares = pgTable(
  "song_user_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    sharedWithUserId: uuid("shared_with_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("song_user_share_unique").on(table.songId, table.sharedWithUserId),
  ]
);
