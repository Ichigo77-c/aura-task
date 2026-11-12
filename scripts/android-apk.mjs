#!/usr/bin/env node
/**
 * Builds the Aura Tasks Android app and copies the artifact to dist/android/.
 *
 * Usage:
 *   node scripts/android-apk.mjs              # debug APK
 *   node scripts/android-apk.mjs --release    # release APK (signed via android/keystore.properties, falls back to debug key)
 *   node scripts/android-apk.mjs --aab        # Play Store .aab bundle
 *
 * Android SDK must be on ANDROID_HOME / ANDROID_SDK_ROOT or in local.properties.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const isWin = process.platform === "win32";
const gradlew = isWin ? path.join(ROOT, "android", "gradlew.bat") : path.join(ROOT, "android", "gradlew");
const ANDROID_OUT = path.join(ROOT, "dist", "android");

const args = process.argv.slice(2);
const aab = args.includes("--aab");
const release = args.includes("--release") || aab;
const task = aab ? "bundleRelease" : release ? "assembleRelease" : "assembleDebug";

if (!existsSync(gradlew)) {
  console.error("android/gradlew not found - run `npx cap add android` first.");
  process.exit(1);
}

// 1) Generate the out/ webDir fallback, then copy config + assets into the
//    native project so the compiled WebView points at the right PWA URL.
const prep = [
  spawnSync(process.execPath, [path.join(ROOT, "scripts", "android-out.mjs")], { stdio: "inherit" }),
  spawnSync(isWin ? "npx.cmd" : "npx", ["cap", "copy", "android"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  }),
];
for (const p of prep) {
  if (p.status !== 0) {
    console.error("\nPrep step failed - see output above.");
    process.exit(p.status ?? 1);
  }
}

console.log(`\n> ${task}`);
const spawn = isWin
  ? spawnSync("cmd.exe", ["/c", gradlew, task], { cwd: path.join(ROOT, "android"), stdio: "inherit", env: process.env })
  : spawnSync(gradlew, [task], { cwd: path.join(ROOT, "android"), stdio: "inherit", env: process.env });
if (spawn.status !== 0) {
  console.error(`\nBuild failed (exit ${spawn.status}).`);
  process.exit(spawn.status ?? 1);
}

// Collect produced artifacts (APK / AAB).
const buildDir = path.join(
  ROOT,
  "android",
  "app",
  "build",
  "outputs",
  aab ? "bundle" : "apk",
  release ? "release" : "debug",
);
const files = existsSync(buildDir) ? readdirSync(buildDir).filter((f) => f.endsWith(".apk") || f.endsWith(".aab")) : [];
if (files.length === 0) {
  console.error(`No artifact found in ${buildDir}`);
  process.exit(1);
}

mkdirSync(ANDROID_OUT, { recursive: true });
for (const f of files) {
  const ext = f.endsWith(".aab") ? ".aab" : ".apk";
  const type = release ? "release" : "debug";
  const dest = path.join(ANDROID_OUT, `AuraTasks-${type}${ext}`);
  copyFileSync(path.join(buildDir, f), dest);
  console.log(`\n✓ ${path.relative(ROOT, dest)}`);
}

if (release && !aab) {
  console.log("\nNext: install on a phone (USB debugging on):\n  adb install -r \"dist/android/AuraTasks-release.apk\"");
}
