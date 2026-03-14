/**
 * generate-icons.mjs
 *
 * Generates all favicon / PWA icon sizes from the source logo.png.
 *
 * Usage:  node scripts/generate-icons.mjs
 *
 * Outputs into apps/web/public/:
 *   favicon.ico          (16 + 32 + 48 embedded)
 *   icons/favicon-16.png
 *   icons/favicon-32.png
 *   icons/favicon-48.png
 *   icons/icon-192.png
 *   icons/icon-512.png
 *   icons/apple-touch-icon.png  (180×180)
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "apps", "web", "public", "logo.png");
const outDir = join(root, "apps", "web", "public", "icons");

await mkdir(outDir, { recursive: true });

// Define all sizes we need
const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-48.png", size: 48 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

console.log("Generating icons from logo.png ...\n");

for (const { name, size } of sizes) {
  const out = join(outDir, name);
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(out);
  console.log(`  ✓ icons/${name}  (${size}×${size})`);
}

// Generate favicon.ico (multi-size: 16, 32, 48)
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map((s) =>
    sharp(source)
      .resize(s, s, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  )
);
const icoBuffer = await pngToIco(icoPngs);
const { writeFile } = await import("node:fs/promises");
await writeFile(join(root, "apps", "web", "public", "favicon.ico"), icoBuffer);
console.log("  ✓ favicon.ico    (16+32+48)");

console.log("\nDone! All icons written to apps/web/public/");
