/**
 * Push Drizzle schema to DB (wrapper for cross-directory drizzle-kit push).
 */
import { execSync } from "child_process";

console.log("Pushing Drizzle schema to database...");
execSync("pnpm --filter @vpc-music/api db:push", { stdio: "inherit" });
