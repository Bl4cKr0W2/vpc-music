/**
 * Build router — delegates to the correct workspace build command.
 */
import { execSync } from "child_process";

const target = process.argv[2] || "web";

const targets = {
  web: "pnpm --filter @vpc-music/web build",
  api: "pnpm --filter @vpc-music/api build",
  all: "pnpm build:web && pnpm build:api",
};

const cmd = targets[target];
if (!cmd) {
  console.error(`Unknown build target: ${target}. Use: web | api | all`);
  process.exit(1);
}

console.log(`Building: ${target}`);
execSync(cmd, { stdio: "inherit" });
