/**
 * generate-icons.test.mjs
 *
 * Tests for the generate-icons.mjs script.
 * Validates source SVG, generated PNG/ICO outputs, and dimensions.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFile, stat, rename, unlink, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "apps", "web", "public");
const iconsDir = join(publicDir, "icons");
const svgPath = join(publicDir, "logo.svg");
const pngPath = join(publicDir, "logo.png");
const faviconPath = join(publicDir, "favicon.ico");
const scriptPath = join(__dirname, "generate-icons.mjs");

// ── Positive Tests: SVG Source ────────────────────────────────
describe("SVG source (logo.svg)", () => {
  let svgContent;

  beforeAll(async () => {
    svgContent = await readFile(svgPath, "utf-8");
  });

  it("exists in public directory", () => {
    expect(existsSync(svgPath)).toBe(true);
  });

  it("is a valid SVG with an <svg> root element", () => {
    expect(svgContent).toMatch(/<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  });

  it("has a 512×512 viewBox", () => {
    expect(svgContent).toMatch(/viewBox="0 0 512 512"/);
  });

  it("contains the brand navy color #000435", () => {
    expect(svgContent).toContain("#000435");
  });

  it("contains the brand gold color #ca9762", () => {
    expect(svgContent).toContain("#ca9762");
  });

  it("contains white (#ffffff) for the cross", () => {
    expect(svgContent).toContain("#ffffff");
  });

  it("contains a <g> group element for the logo composition", () => {
    expect(svgContent).toMatch(/<g\s/);
  });

  it("contains multiple <path> elements (clef + cross)", () => {
    const pathCount = (svgContent.match(/<path\s/g) || []).length;
    expect(pathCount).toBeGreaterThanOrEqual(2);
  });
});

// ── Positive Tests: Generated Outputs ────────────────────────
describe("generated outputs", () => {
  const expectedIcons = [
    { name: "favicon-16.png", size: 16 },
    { name: "favicon-32.png", size: 32 },
    { name: "favicon-48.png", size: 48 },
    { name: "icon-192.png", size: 192 },
    { name: "icon-512.png", size: 512 },
  ];

  const tileIcons = [
    // White background — original multi-colour logo
    { name: "apple-touch-icon.png", size: 180, variant: "white", bgR: 255, bgG: 255, bgB: 255 },
    { name: "icon-192-tile-white.png", size: 192, variant: "white", bgR: 255, bgG: 255, bgB: 255 },
    { name: "icon-512-tile-white.png", size: 512, variant: "white", bgR: 255, bgG: 255, bgB: 255 },
    // Gold background — monochrome navy logo
    { name: "apple-touch-icon-gold.png", size: 180, variant: "gold", bgR: 202, bgG: 151, bgB: 98 },
    { name: "icon-192-tile-gold.png", size: 192, variant: "gold", bgR: 202, bgG: 151, bgB: 98 },
    { name: "icon-512-tile-gold.png", size: 512, variant: "gold", bgR: 202, bgG: 151, bgB: 98 },
    // Navy background — monochrome gold logo
    { name: "apple-touch-icon-navy.png", size: 180, variant: "navy", bgR: 0, bgG: 4, bgB: 53 },
    { name: "icon-192-tile-navy.png", size: 192, variant: "navy", bgR: 0, bgG: 4, bgB: 53 },
    { name: "icon-512-tile-navy.png", size: 512, variant: "navy", bgR: 0, bgG: 4, bgB: 53 },
  ];

  describe("logo.png (512×512)", () => {
    it("exists", () => {
      expect(existsSync(pngPath)).toBe(true);
    });

    it("is a valid PNG", async () => {
      const buf = await readFile(pngPath);
      // PNG magic bytes: 89 50 4E 47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50); // P
      expect(buf[2]).toBe(0x4e); // N
      expect(buf[3]).toBe(0x47); // G
    });

    it("has dimensions 512×512", async () => {
      const meta = await sharp(pngPath).metadata();
      expect(meta.width).toBe(512);
      expect(meta.height).toBe(512);
    });

    it("has transparent background (alpha channel)", async () => {
      const meta = await sharp(pngPath).metadata();
      expect(meta.hasAlpha).toBe(true);
    });

    it("is non-trivially sized (> 1 KB)", async () => {
      const info = await stat(pngPath);
      expect(info.size).toBeGreaterThan(1024);
    });
  });

  describe("favicon.ico", () => {
    it("exists", () => {
      expect(existsSync(faviconPath)).toBe(true);
    });

    it("has ICO magic bytes (00 00 01 00)", async () => {
      const buf = await readFile(faviconPath);
      expect(buf[0]).toBe(0x00);
      expect(buf[1]).toBe(0x00);
      expect(buf[2]).toBe(0x01);
      expect(buf[3]).toBe(0x00);
    });

    it("is non-trivially sized (> 500 bytes)", async () => {
      const info = await stat(faviconPath);
      expect(info.size).toBeGreaterThan(500);
    });
  });

  for (const { name, size } of expectedIcons) {
    describe(`icons/${name} (${size}×${size})`, () => {
      const iconPath = join(iconsDir, name);

      it("exists", () => {
        expect(existsSync(iconPath)).toBe(true);
      });

      it("is a valid PNG", async () => {
        const buf = await readFile(iconPath);
        expect(buf[0]).toBe(0x89);
        expect(buf[1]).toBe(0x50);
        expect(buf[2]).toBe(0x4e);
        expect(buf[3]).toBe(0x47);
      });

      it(`has dimensions ${size}×${size}`, async () => {
        const meta = await sharp(iconPath).metadata();
        expect(meta.width).toBe(size);
        expect(meta.height).toBe(size);
      });

      it("has transparent background", async () => {
        const meta = await sharp(iconPath).metadata();
        expect(meta.hasAlpha).toBe(true);
      });
    });
  }

  for (const { name, size, variant, bgR, bgG, bgB } of tileIcons) {
    describe(`icons/${name} (${size}×${size}, ${variant} tile)`, () => {
      const iconPath = join(iconsDir, name);

      it("exists", () => {
        expect(existsSync(iconPath)).toBe(true);
      });

      it("is a valid PNG", async () => {
        const buf = await readFile(iconPath);
        expect(buf[0]).toBe(0x89);
        expect(buf[1]).toBe(0x50);
        expect(buf[2]).toBe(0x4e);
        expect(buf[3]).toBe(0x47);
      });

      it(`has dimensions ${size}×${size}`, async () => {
        const meta = await sharp(iconPath).metadata();
        expect(meta.width).toBe(size);
        expect(meta.height).toBe(size);
      });

      it(`has ${variant} background (top-left pixel)`, async () => {
        const { data } = await sharp(iconPath)
          .extract({ left: 0, top: 0, width: 1, height: 1 })
          .raw()
          .toBuffer({ resolveWithObject: true });
        // Allow slight variance from rounding
        expect(data[0]).toBeCloseTo(bgR, -1);
        expect(data[1]).toBeCloseTo(bgG, -1);
        expect(data[2]).toBeCloseTo(bgB, -1);
      });
    });
  }
});

// ── Positive Tests: manifest.json consistency ────────────────
describe("manifest.json icon references", () => {
  let manifest;

  beforeAll(async () => {
    manifest = JSON.parse(await readFile(join(publicDir, "manifest.json"), "utf-8"));
  });

  it("has an icons array", () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("every icon src points to a file that exists", () => {
    for (const icon of manifest.icons) {
      const fullPath = join(publicDir, icon.src.replace(/^\//, ""));
      expect(existsSync(fullPath), `Missing icon: ${icon.src}`).toBe(true);
    }
  });

  it("declares correct sizes for referenced icons", () => {
    for (const icon of manifest.icons) {
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
    }
  });

  it("uses theme_color #000435", () => {
    expect(manifest.theme_color).toBe("#000435");
  });

  it("uses background_color #000435", () => {
    expect(manifest.background_color).toBe("#000435");
  });
});

// ── Negative Tests: Script Resilience ─────────────────────────
describe("negative — script resilience", () => {
  it("script fails gracefully when SVG source is missing", async () => {
    const backupPath = svgPath + ".bak";
    let result;
    try {
      // Temporarily rename the SVG so the script can't find it
      await rename(svgPath, backupPath);
      result = await execFileAsync("node", [scriptPath], {
        cwd: root,
        timeout: 15000,
      }).catch((err) => err);
    } finally {
      // Restore the SVG
      if (existsSync(backupPath)) {
        await rename(backupPath, svgPath);
      }
    }

    // The script should have exited with a non-zero code or thrown
    expect(
      result instanceof Error || (result && result.code !== 0)
    ).toBe(true);
  });

  it("script succeeds even if icons/ directory is removed (mkdir -p)", async () => {
    const backupDir = iconsDir + ".bak";
    try {
      // Temporarily rename the icons directory
      if (existsSync(iconsDir)) {
        await rename(iconsDir, backupDir);
      }

      // Run the script — should recreate icons/
      const { stdout } = await execFileAsync("node", [scriptPath], {
        cwd: root,
        timeout: 30000,
      });

      expect(stdout).toContain("Done!");
      expect(existsSync(iconsDir)).toBe(true);
      expect(existsSync(join(iconsDir, "icon-512.png"))).toBe(true);
    } finally {
      // Clean up: remove re-generated and restore backup
      if (existsSync(backupDir)) {
        await rm(iconsDir, { recursive: true, force: true });
        await rename(backupDir, iconsDir);
      }
    }
  });

  it("SVG is not empty", async () => {
    const info = await stat(svgPath);
    expect(info.size).toBeGreaterThan(100);
  });

  it("generated PNGs are not identical (different sizes have different byte counts)", async () => {
    const sizes = await Promise.all([
      stat(join(iconsDir, "favicon-16.png")),
      stat(join(iconsDir, "icon-512.png")),
    ]);
    // A 16×16 PNG should be significantly smaller than a 512×512 PNG
    expect(sizes[0].size).toBeLessThan(sizes[1].size);
  });

  it("logo.png is not a placeholder (has non-trivial pixel variance)", async () => {
    const { data, info } = await sharp(pngPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Sample pixels evenly across the full image to avoid hitting only transparent areas
    const pixelCount = info.width * info.height;
    const channels = info.channels;
    const sampleCount = 2000;
    const step = Math.max(1, Math.floor(pixelCount / sampleCount));
    let uniquePixels = new Set();
    for (let i = 0; i < pixelCount; i += step) {
      const offset = i * channels;
      const key = `${data[offset]},${data[offset + 1]},${data[offset + 2]}`;
      uniquePixels.add(key);
    }
    // A real logo should have at least a few distinct colors (navy, gold, white, transparent)
    expect(uniquePixels.size).toBeGreaterThan(2);
  });
});
