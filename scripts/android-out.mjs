#!/usr/bin/env node
/**
 * Writes the out/ webDir used by Capacitor's copy step.
 *
 * Because the app runs from a remote URL (capacitor.config.ts -> server.url),
 * this directory only needs a valid index.html. The generated page is a
 * branded loader that redirects to the same production URL the WebView
 * uses, so even if the remote PWA is unreachable the user sees the app
 * instead of a blank asset.
 *
 * Usage: node scripts/android-out.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "out");

const webUrl = process.env.CAPACITOR_WEB_URL || "https://aura-task-seven.vercel.app";

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#8b5cf6" />
    <title>Aura Tasks</title>
    <style>
      html, body {
        margin: 0; height: 100%;
        background: #09090b;
        color: #e4e4e7;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column; gap: 12px;
      }
      .mark {
        width: 64px; height: 64px; border-radius: 18px;
        background: linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6);
        display: flex; align-items: center; justify-content: center;
        font-size: 30px; font-weight: 700; color: white;
      }
      p { color: #a1a1aa; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="mark">A</div>
    <p>Launching Aura Tasks…</p>
    <script>
      setTimeout(function () {
        location.replace("${webUrl}");
      }, 1500);
    </script>
  </body>
</html>
`;

await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "index.html"), html, "utf8");
console.log(`✓ out/index.html written (redirects to ${webUrl})`);
