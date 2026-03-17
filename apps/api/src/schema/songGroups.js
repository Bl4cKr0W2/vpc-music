// Drizzle ORM schema — reusable song groups
import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { songs } from "./songs.js";

export const songGroups = pgTable(
  "song_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("song_group_org_name_unique").on(table.organizationId, table.name),
  ]
);

export const songGroupSongs = pgTable(
  "song_group_songs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => songGroups.id, { onDelete: "cascade" }),
    songId: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("song_group_song_unique").on(table.groupId, table.songId),
  ]
);