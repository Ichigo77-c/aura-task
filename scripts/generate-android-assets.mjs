#!/usr/bin/env node
/**
 * Generates all Android icons and splash screens for the Capacitor project
 * from the single brand source: public/icon.svg (PWA icon).
 *
 * Sizes mirror whatever the `cap add android` template already provides, so
 * re-running the script after upgrading Capacitor keeps everything in sync.
 *
 * Usage: node scripts/generate-android-assets.mjs
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ANDROID = path.join(ROOT, "android", "app", "src", "main");
const RES = path.join(ANDROID, "res");
const SRC_SVG = path.join(ROOT, "public", "icon.svg");

// Brand palette (matches PWA manifest: background #09090b, theme #8b5cf6)
const BRAND = { splashBg: "#09090b", splashIconScale: 0.45 };

const svg = await readFile(SRC_SVG);

/** Render the brand icon at a given square size. */
function iconAt(size) {
  return sharp(svg).resize(size, size, { fit: "cover" });
}

/** Read a template PNG's dimensions so we keep Capacitor's expected sizes. */
async function templateSize(file) {
  try {
    const meta = await sharp(path.join(RES, file)).metadata();
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

/** White square of `size`px with a transparent circle hole cut out (inverse mask). */
function roundMask(size) {
  const r = size / 2;
  const mask = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - r + 0.5, dy = y - r + 0.5;
      const inside = dx * dx + dy * dy <= r * r;
      mask[i] = 255; // R
      mask[i + 1] = 255; // G
      mask[i + 2] = 255; // B
      mask[i + 3] = inside ? 255 : 0; // A
    }
  }
  return sharp(mask, { raw: { width: size, height: size, channels: 4 } });
}

async function overwritePng(rel, pipeline) {
  const target = path.join(RES, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await pipeline.toFile(target);
  console.log(`  ✓ ${rel}`);
}

// --- Launcher icons (mipmap-*dpi) ----------------------------------------
console.log("Launcher icons");
for (const dir of ["mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi"]) {
  const size = (await templateSize(`${dir}/ic_launcher.png`))?.width ?? 108;

  // Legacy + fallback launcher icon: full brand tile on transparent bg.
  await overwritePng(`${dir}/ic_launcher.png`, iconAt(size));
  // Round launcher: brand tile clipped to a circle.
  await overwritePng(
    `${dir}/ic_launcher_round.png`,
    iconAt(size).composite([{ input: await roundMask(size).png().toBuffer(), blend: "in" }]),
  );
  // Adaptive icon foreground: icon centered at 66% scale (safe zone).
  await overwritePng(
    `${dir}/ic_launcher_foreground.png`,
    sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        {
          input: await iconAt(Math.round(size * 0.66)).png().toBuffer(),
          gravity: "center",
        },
      ]),
  );
}

// --- Splash screens (drawable / drawable-{orientation}-{dpi}) -------------
console.log("Splash screens");
const splashDirs = [
  "drawable",
  "drawable-port-mdpi",
  "drawable-port-hdpi",
  "drawable-port-xhdpi",
  "drawable-port-xxhdpi",
  "drawable-port-xxxhdpi",
  "drawable-land-mdpi",
  "drawable-land-hdpi",
  "drawable-land-xhdpi",
  "drawable-land-xxhdpi",
  "drawable-land-xxxhdpi",
];
for (const dir of splashDirs) {
  const tpl = await templateSize(`${dir}/splash.png`);
  if (!tpl) continue;
  const { width, height } = tpl;
  const iconPx = Math.round(Math.min(width, height) * BRAND.splashIconScale);
  await overwritePng(
    `${dir}/splash.png`,
    sharp({
      create: { width, height, channels: 3, background: BRAND.splashBg },
    }).composite([{ input: await iconAt(iconPx).png().toBuffer(), gravity: "center" }]),
  );
}

console.log("\nAndroid assets generated. Run `npx cap copy android` to copy the updated config, then build with `npm run android:apk:debug`.");
