/**
 * Check shared/ drift — verifies apps/api/shared/ is in sync with shared/
 */
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";

const SHARED = join(process.cwd(), "shared");
const API_SHARED = join(process.cwd(), "apps", "api", "shared");

if (!existsSync(API_SHARED)) {
  console.log("⚠️  apps/api/shared/ does not exist yet — run `pnpm sync:shared` first.");
  process.exit(1);
}

function getFiles(dir, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory()) {
      files.push(...getFiles(full, base));
    } else {
      files.push(relative(base, full));
    }
  }
  return files;
}

const sharedFiles = getFiles(SHARED);
let drifted = false;

for (const file of sharedFiles) {
  const src = join(SHARED, file);
  const dest = join(API_SHARED, file);
  if (!existsSync(dest)) {
    console.log(`MISSING: apps/api/shared/${file}`);
    drifted = true;
    continue;
  }
  if (readFileSync(src, "utf8") !== readFileSync(dest, "utf8")) {
    console.log(`DRIFTED: apps/api/shared/${file}`);
    drifted = true;
  }
}

if (drifted) {
  console.error("\n❌ shared/ drift detected. Run `pnpm sync:shared` to fix.");
  process.exit(1);
} else {
  console.log("✅ shared/ is in sync.");
}
