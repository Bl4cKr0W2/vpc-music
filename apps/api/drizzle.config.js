import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env" });

export default defineConfig({
  schema: "./src/schema/*.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schemaFilter: ["public"],
});
