#!/usr/bin/env node

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const appDir = path.join(root, "electron-app");
const buildDir = path.join(root, "build");
const iconSource = path.join(root, "public", "icon.svg");

await mkdir(appDir, { recursive: true });
await mkdir(buildDir, { recursive: true });
await copyFile(path.join(root, "electron", "main.js"), path.join(appDir, "main.js"));

await sharp(iconSource)
  .resize(512, 512)
  .png()
  .toFile(path.join(appDir, "icon.png"));
await copyFile(iconSource, path.join(buildDir, "icon.svg"));

console.log("✓ Minimal Electron wrapper prepared in electron-app/");
