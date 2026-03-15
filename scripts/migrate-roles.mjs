#!/usr/bin/env node
/**
 * One-time migration: Convert user_role enum from
 * [viewer, editor, admin] → [owner, member]
 *
 * Usage:
 *   node scripts/migrate-roles.mjs stg
 */

import { createRequire } from "node:module";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(__dirname, "../apps/api");

const require = createRequire(resolve(apiDir, "package.json"));
const pg = require("pg");

const envAliases = {
  dev: "development", development: "development",
  stg: "staging", stage: "staging", staging: "staging",
  prd: "production", prod: "production", production: "production",
};

const rawEnv = process.argv[2];
const env = rawEnv ? (envAliases[rawEnv.toLowerCase()] ?? rawEnv) : undefined;
const envFile = env ? `.env.${env}` : ".env";

config({ path: resolve(apiDir, envFile) });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("1. Adding new enum values to user_role...");
    // Add new values (ignore if already exists)
    try { await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner'"); } catch (e) { console.log("  'owner' already exists or cannot add in transaction"); }
    try { await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member'"); } catch (e) { console.log("  'member' already exists or cannot add in transaction"); }

    await client.query("COMMIT");

    // ALTER TYPE ADD VALUE cannot run inside a transaction in older PG,
    // so let's check if the values were added
    const enumCheck = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')"
    );
    const labels = enumCheck.rows.map(r => r.enumlabel);
    console.log("  Current enum values:", labels);

    if (!labels.includes("owner") || !labels.includes("member")) {
      console.log("  Trying outside transaction...");
      await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner'");
      await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member'");
    }

    console.log("2. Migrating existing rows...");
    // admin → owner, editor → member, viewer → member
    const r1 = await client.query("UPDATE users SET role = 'owner' WHERE role = 'admin'");
    console.log(`  admin → owner: ${r1.rowCount} rows`);
    const r2 = await client.query("UPDATE users SET role = 'member' WHERE role = 'editor'");
    console.log(`  editor → member: ${r2.rowCount} rows`);
    const r3 = await client.query("UPDATE users SET role = 'member' WHERE role = 'viewer'");
    console.log(`  viewer → member: ${r3.rowCount} rows`);

    console.log("3. Recreating enum without old values...");
    // Drop default first, then rename/recreate
    await client.query("ALTER TABLE users ALTER COLUMN role DROP DEFAULT");
    await client.query("ALTER TYPE user_role RENAME TO user_role_old");
    await client.query("CREATE TYPE user_role AS ENUM ('owner', 'member')");
    await client.query("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role");
    await client.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'");
    await client.query("DROP TYPE user_role_old");

    console.log("✓ Migration complete!");

    // Show final state
    const finalCheck = await client.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')"
    );
    console.log("  Final enum values:", finalCheck.rows.map(r => r.enumlabel));

    const users = await client.query("SELECT id, email, role FROM users");
    console.log("  Users:", users.rows);
  } catch (err) {
    console.error("Migration failed:", err.message);
    try { await client.query("ROLLBACK"); } catch {}
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
