/**
 * generate-icons.mjs
 *
 * Generates all favicon / PWA icon sizes from the source logo.svg.
 * Also regenerates logo.png (512×512) used by the web app.
 * Produces tile icons in three colour variants with rounded corners:
 *   • white  — white background, original multi-colour logo
 *   • gold   — gold (#ca9762) background, monochrome navy (#000435) logo
 *   • navy   — navy (#000435) background, monochrome gold (#ca9762) logo
 *
 * Usage:  node scripts/generate-icons.mjs
 *
 * Outputs into apps/web/public/:
 *   logo.png                            (512×512, transparent)
 *   favicon.ico                         (16 + 32 + 48 embedded, transparent)
 *   icons/favicon-16.png                (transparent)
 *   icons/favicon-32.png                (transparent)
 *   icons/favicon-48.png                (transparent)
 *   icons/icon-192.png                  (transparent)
 *   icons/icon-512.png                  (transparent)
 *   icons/apple-touch-icon.png          (180×180, white bg, rounded)
 *   icons/apple-touch-icon-gold.png     (180×180, gold bg, rounded)
 *   icons/apple-touch-icon-navy.png     (180×180, navy bg, rounded)
 *   icons/icon-192-tile-white.png       (white bg, rounded)
 *   icons/icon-192-tile-gold.png        (gold bg, rounded)
 *   icons/icon-192-tile-navy.png        (navy bg, rounded)
 *   icons/icon-512-tile-white.png       (white bg, rounded)
 *   icons/icon-512-tile-gold.png        (gold bg, rounded)
 *   icons/icon-512-tile-navy.png        (navy bg, rounded)
 */

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "apps", "web", "public");
const source = join(publicDir, "logo.svg");
const outDir = join(publicDir, "icons");

await mkdir(outDir, { recursive: true });

// Brand colours
const BRAND_NAVY = "#000435";
const BRAND_GOLD = "#ca9762";

const NAVY_RGBA = { r: 0, g: 4, b: 53, alpha: 1 };
const GOLD_RGBA = { r: 202, g: 151, b: 98, alpha: 1 };
const WHITE_RGBA = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 255, g: 255, b: 255, alpha: 0 };

// ── SVG helpers ──────────────────────────────────────────────────────────
// Read SVG once, then create monochrome variants via fill replacement
const svgText = await readFile(source, "utf8");

/** Replace every `fill:` colour in the SVG (both CSS and inline) with one colour */
function recolourSvg(svg, colour) {
  return svg.replace(/fill:\s*#[0-9a-fA-F]{3,8}/g, `fill:${colour}`);
}

/**
 * Create an SVG mask with rounded corners.
 * Uses ~22 % corner radius (iOS-style squircle feel).
 */
function roundedMask(size) {
  const r = Math.round(size * 0.22);
  return Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/></svg>`
  );
}

// Define all sizes we need (transparent background)
const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-48.png", size: 48 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

// Tile sizes (logo with ~20 % padding)
const tileSizes = [
  { base: "apple-touch-icon", size: 180, logoSize: 140 },
  { base: "icon-192-tile", size: 192, logoSize: 148 },
  { base: "icon-512-tile", size: 512, logoSize: 396 },
];

// Three tile colour variants
const tileVariants = [
  { suffix: "white", bg: WHITE_RGBA, svgColour: null },       // original logo
  { suffix: "gold", bg: GOLD_RGBA, svgColour: BRAND_NAVY },   // navy mono
  { suffix: "navy", bg: NAVY_RGBA, svgColour: BRAND_GOLD },   // gold mono
];

console.log("Generating icons from logo.svg ...\n");

// ── logo.png (512×512, transparent) ──────────────────────────────────────
const logoPng = join(publicDir, "logo.png");
await sharp(source, { density: 300 })
  .resize(512, 512, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile(logoPng);
console.log("  ✓ logo.png              (512×512)");

// ── Transparent favicons / icons ─────────────────────────────────────────
for (const { name, size } of sizes) {
  const out = join(outDir, name);
  await sharp(source, { density: 300 })
    .resize(size, size, { fit: "contain", background: TRANSPARENT })
    .png()
    .toFile(out);
  console.log(`  ✓ icons/${name.padEnd(28)} (${size}×${size})`);
}

// ── Tile icons (3 sizes × 3 colour variants, rounded corners) ────────────
for (const { base, size, logoSize } of tileSizes) {
  for (const { suffix, bg, svgColour } of tileVariants) {
    const svgInput = svgColour ? Buffer.from(recolourSvg(svgText, svgColour)) : source;

    const logoBuf = await sharp(svgInput, { density: 300 })
      .resize(logoSize, logoSize, { fit: "contain", background: TRANSPARENT })
      .png()
      .toBuffer();

    // apple-touch-icon keeps bare name for the white (default) variant
    const fileName =
      base === "apple-touch-icon" && suffix === "white"
        ? `${base}.png`
        : `${base}-${suffix}.png`;

    const out = join(outDir, fileName);

    // Build the square tile then clip with a rounded-corner mask
    const squareBuf = await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: logoBuf, gravity: "centre" }])
      .png()
      .toBuffer();

    await sharp(squareBuf)
      .composite([{ input: roundedMask(size), blend: "dest-in" }])
      .png()
      .toFile(out);

    console.log(`  ✓ icons/${fileName.padEnd(28)} (${size}×${size}, ${suffix} tile)`);
  }
}

// ── favicon.ico (multi-size: 16, 32, 48) ────────────────────────────────
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map((s) =>
    sharp(source, { density: 300 })
      .resize(s, s, { fit: "contain", background: TRANSPARENT })
      .png()
      .toBuffer()
  )
);
const icoBuffer = await pngToIco(icoPngs);
const { writeFile } = await import("node:fs/promises");
await writeFile(join(publicDir, "favicon.ico"), icoBuffer);
console.log("  ✓ favicon.ico            (16+32+48)");

console.log("\nDone! All icons written to apps/web/public/");
