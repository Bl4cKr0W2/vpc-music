#!/usr/bin/env node
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
  stg: "staging", staging: "staging",
  prd: "production", production: "production",
};
const rawEnv = process.argv[2];
const env = rawEnv ? (envAliases[rawEnv.toLowerCase()] ?? rawEnv) : undefined;
const envFile = env ? `.env.${env}` : ".env";
config({ path: resolve(apiDir, envFile) });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const c = await pool.connect();
  try {
    // The column still references user_role_old — swap it to user_role
    const check = await c.query("SELECT 1 FROM pg_type WHERE typname = 'user_role_old'");
    if (check.rows.length > 0) {
      console.log("Swapping column type from user_role_old to user_role...");
      await c.query("ALTER TABLE users ALTER COLUMN role DROP DEFAULT");
      await c.query("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role");
      await c.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'");
      await c.query("DROP TYPE user_role_old");
      console.log("Done — dropped user_role_old");
    } else {
      console.log("No user_role_old to clean up");
    }

    // Ensure default is set
    await c.query("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'");
    console.log("Default set to member");

    // Final state
    const enums = await c.query(
      "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')"
    );
    console.log("user_role values:", enums.rows.map(r => r.enumlabel));

    const users = await c.query("SELECT id, email, role FROM users");
    console.log("Users:", users.rows);
  } finally {
    c.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
