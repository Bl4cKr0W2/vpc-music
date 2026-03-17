// Drizzle ORM schema — songs, keys, metadata
import { pgTable, text, timestamp, boolean, integer, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const songs = pgTable("songs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  aka: text("aka"),
  category: text("category"),
  key: text("key"),              // e.g. "G", "Bb"
  tempo: integer("tempo"),       // BPM
  artist: text("artist"),
  shout: text("shout"),
  year: text("year"),
  tags: text("tags"),            // comma-separated or JSON array
  content: text("content").notNull(), // ChordPro source
  isDraft: boolean("is_draft").default(false),
  defaultVariationId: uuid("default_variation_id").references(() => songVariations.id, { onDelete: "set null" }),
  organizationId: uuid("organization_id").references(() => organizations.id),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const songVariations = pgTable("song_variations", {
  id: uuid("id").defaultRandom().primaryKey(),
  songId: uuid("song_id").notNull().references(() => songs.id),
  name: text("name").notNull(),  // e.g. "My version", "Acoustic"
  content: text("content").notNull(),
  key: text("key"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
