import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Aura Tasks - Capacitor (Android APK) configuration.
 *
 * The web layer is the hosted Next.js 16 PWA (manifest in /manifest.json).
 * API routes + Prisma server components make a static `out/` export
 * impossible, so the Android app is a WebView shell that loads the
 * production URL (overridable via the CAPACITOR_WEB_URL env var).
 *
 * `webDir` points at a generated fallback (out/) so `cap copy` has a valid
 * assets directory. At runtime the WebView loads server.url; out/ remains a
 * local fallback. Regenerate it with `node scripts/android-out.mjs`.
 *
 * After changing the URL: `npx cap copy android` (the effective config is
 * copied into the Android project on copy/sync).
 */

const appUrl = process.env.CAPACITOR_WEB_URL || "https://aura-task-seven.vercel.app";

const config: CapacitorConfig = {
  appId: "com.auratasks.app",
  appName: "Aura Tasks",
  // Fallback web directory. Kept minimal (out/index.html) so `cap copy`
  // succeeds; the live PWA comes from server.url, not this directory.
  webDir: "out",
  server: {
    // Load the deployed Next.js app so its API routes, auth, and Prisma-backed
    // pages remain available inside the Android WebView.
    url: appUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: {
      // No native HTTP intercepting; the WebView talks to the PWA directly.
    },
  },
};

export default config;
