// Drizzle ORM schema — users & global roles
import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["owner", "member"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  role: userRoleEnum("role").default("member"),  // owner = global super-admin
  preferences: text("preferences"),  // JSON blob — theme, zoom, notation mode, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
