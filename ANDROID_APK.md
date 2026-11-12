# Aura Tasks — Android APK Build Guide

Android support uses **Capacitor 8** (`@capacitor/android`).

## How it works

Aura Tasks has Next.js API routes, NextAuth, and Prisma-backed server pages, so
it cannot be shipped as a static export. The APK is a native WebView shell
(`com.auratasks.app`) that loads the hosted application:

```text
APK -> WebView -> https://aura-task-seven.vercel.app
```

The default address is `server.url` in `capacitor.config.ts`. Override it at
build time with `CAPACITOR_WEB_URL`.

## Prerequisites

- Node.js 20 or newer.
- JDK 17 on `PATH` (`java -version` must work).
- Android SDK Platform 36 and Build Tools 36.
- Either set `ANDROID_HOME`/`ANDROID_SDK_ROOT`, or keep an
  `android/local.properties` file that points `sdk.dir` at the SDK.
- Optional: Android Studio for `npm run android:open`.

This machine already has Android SDK Platform 36, Build Tools 36, and `adb` at
`C:\Users\Neweye\AppData\Local\Android\Sdk`. The remaining local blocker is
JDK 17: Java is not currently available on `PATH`.

## Build commands

```bash
# Generate icons/splashes and copy the latest URL/config into Android
npm run android:sync

# Debug APK -> dist/android/AuraTasks-debug.apk
npm run android:apk:debug

# Release APK -> dist/android/AuraTasks-release.apk
npm run android:apk:release

# Play Store bundle -> dist/android/AuraTasks-release.aab
npm run android:aab

# Open the native project in Android Studio
npm run android:open
```

Every APK/AAB command regenerates the fallback page and runs `cap copy` before
Gradle, so `android/app/src/main/assets/capacitor.config.json` stays current.

To target another deployment in PowerShell:

```powershell
$env:CAPACITOR_WEB_URL="https://your-project.vercel.app"
npm run android:apk:debug
```

On GitHub Actions, set the repository variable `PWA_URL`, or supply `pwa_url`
when manually dispatching `.github/workflows/android-apk.yml`.

## Install on a phone

Enable Developer options and USB debugging, connect the phone, then run:

```bash
"/c/Users/Neweye/AppData/Local/Android/Sdk/platform-tools/adb.exe" devices
"/c/Users/Neweye/AppData/Local/Android/Sdk/platform-tools/adb.exe" install -r dist/android/AuraTasks-debug.apk
```

You can also copy the APK to the phone and open it there. Android may ask for
permission to install apps from that file manager/browser.

## Release signing

For local testing, release builds fall back to the Android debug key. That is
**not** suitable for Play Store publication or reliable app updates.

Create a permanent keystore and copy
`android/keystore.properties.example` to the gitignored
`android/keystore.properties`:

```bash
keytool -genkeypair -v \
  -keystore android/keystore/aura-tasks.keystore \
  -alias aura-tasks -keyalg RSA -keysize 2048 -validity 10000
```

```properties
storeFile=../keystore/aura-tasks.keystore
storePassword=...
keyAlias=aura-tasks
keyPassword=...
```

Back up the keystore and passwords securely. Every future update must use the
same key. Never commit the keystore or its passwords.

The current CI workflow creates a new temporary self-signed key per run. Its
release APK is suitable only for testing; configure encrypted GitHub secrets
with the permanent keystore before publishing updates.

## Versioning

```powershell
$env:APK_VERSION_CODE="2"
$env:APK_VERSION_NAME="1.0.1"
npm run android:apk:release
```

`APK_VERSION_CODE` must increase for every store update.

## Troubleshooting

- **`JAVA_HOME is not set` / `java` not found** — install JDK 17, reopen the
  terminal, and verify `java -version`.
- **SDK location not found** — set `ANDROID_HOME`, or verify
  `android/local.properties` contains the correct escaped Windows SDK path.
- **Blank screen or login loop** — verify
  `https://aura-task-seven.vercel.app/auth/signin` works and the deployment's
  `NEXTAUTH_URL` uses that same host.
- **Stale URL/config** — run `npm run android:sync`, then inspect
  `android/app/src/main/assets/capacitor.config.json` for `server.url`.
- **Slow first build** — Gradle downloads dependencies on the first run and can
  take several minutes.
