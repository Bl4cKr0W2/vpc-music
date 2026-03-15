#!/usr/bin/env node
/**
 * db-push.mjs — Push Drizzle schema to the target database.
 *
 * Usage:
 *   pnpm db:push                  # development (.env)
 *   pnpm db:push production       # production (.env.production)
 *   pnpm db:push staging          # staging (.env.staging)
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const apiDir = resolve(__dirname, '../apps/api')

const rawEnv = process.argv[2]
const envAliases = {
  dev: 'development',
  development: 'development',
  stg: 'staging',
  stage: 'staging',
  staging: 'staging',
  prd: 'production',
  prod: 'production',
  production: 'production',
}

const env = rawEnv ? (envAliases[rawEnv.toLowerCase()] ?? rawEnv) : undefined
const envFile = env ? `.env.${env}` : '.env'
const envPath = resolve(apiDir, envFile)

if (env && !existsSync(envPath)) {
  console.error(`Error: ${envPath} not found`)
  process.exit(1)
}

console.log(`\nPushing schema to ${env ?? 'development'} database (${envFile})...\n`)

execSync('pnpm exec drizzle-kit push --config=./drizzle.config.js', {
  stdio: 'inherit',
  cwd: apiDir,
  env: { ...process.env, DOTENV_CONFIG_PATH: envFile },
})
