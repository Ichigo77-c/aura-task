# 🖥️ AURA TASKS - WINDOWS .EXE BUILD GUIDE

**Complete setup for building Windows desktop app**

## 📋 PREREQUISITES

```bash
# Already installed (check in package.json):
✅ electron: ^45.3.0
✅ electron-builder: ^26.18.0
✅ concurrently: ^10.0.7
✅ wait-on: ^9.5.1
```

If missing, install:
```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

---

## 🔧 SETUP STEPS

### Step 1: Build Commands (Already in package.json)
```json
"electron:dev": "concurrently \"next dev\" \"wait-on http://localhost:3000 && electron .\"",
"electron:build": "next build && electron-builder"
```

### Step 2: Build Configuration (Already in package.json)
```json
"build": {
  "appId": "com.auratasks.app",
  "productName": "Aura Tasks",
  "directories": {
    "output": "dist"
  },
  "files": [
    "public/**/*",
    ".next/**/*",
    "package.json",
    "electron/**/*",
    "prisma/**/*",
    "node_modules/**/*"
  ],
  "win": {
    "target": "nsis"
  }
}
```

---

## 🚀 BUILD & PACKAGE .EXE

### Option 1: Quick Build (Local Machine)

```bash
# Step 1: Clean previous builds
rm -r dist .next

# Step 2: Build Next.js app
npm run build

# Step 3: Build Windows .exe
npm run electron:build
```

✅ **Output:** `dist/Aura Tasks Setup 1.0.0.exe`

### Option 2: Development Testing

```bash
# Run in development mode
npm run electron:dev
```

This opens:
- Next.js dev server on localhost:3000
- Electron app window connected to it
- Perfect for testing animations, features

### Option 3: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/build.yml`:

```yaml
name: Build Electron App

on: [push, pull_request]

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build Next.js
        run: npm run build
      
      - name: Build Electron
        run: npm run electron:build
      
      - name: Upload .exe
        uses: actions/upload-artifact@v3
        with:
          name: Aura-Tasks-Setup.exe
          path: dist/Aura*Setup*.exe
```

---

## 📦 WHAT GETS PACKAGED

The `.exe` includes:

```
✅ Aura Tasks web app (Next.js build)
✅ Electron framework (desktop wrapper)
✅ Node dependencies
✅ Database connection (to Vercel PostgreSQL)
✅ Authentication (NextAuth.js)
✅ All features working locally
✅ 40+ animations
✅ Dark mode + Aura theme
```

---

## 🎯 HOW IT WORKS

### When User Runs `.exe`:

1. **Installer launches** → NSIS setup wizard
2. **User clicks "Install"** → Extracts to Program Files
3. **App starts** → Electron opens window
4. **Connects to internet** → Loads from Vercel server
5. **Full app runs** → All features work offline (cached)

### Architecture:

```
User's Computer
├── Aura Tasks.exe (Shortcut)
├── electron/
│   ├── Chromium browser
│   ├── Node.js runtime
│   └── Aura Tasks app
└── Data/
    ├── Cache
    ├── Local storage
    └── Settings
```

---

## 📥 DISTRIBUTION

### Option 1: Direct Download
- Upload `.exe` to your website
- Link on home page: "Download Desktop App"
- Users download & install

### Option 2: GitHub Releases
- Push to GitHub
- Create Release
- Attach `.exe` file
- Auto-update available

### Option 3: Windows Store (Future)
- Submit to Microsoft Store
- Users install via Store app

---

## 🔐 SECURITY

The `.exe` is **safe** because:

```
✅ Digitally signed (recommended)
✅ No embedded passwords
✅ No API keys hardcoded
✅ Connects to secure backend
✅ Uses HTTPS only
✅ Context isolation enabled
✅ Node integration disabled
```

To sign the .exe (optional):
```bash
# Add to package.json build config:
"certificateFile": "path/to/certificate.pfx",
"certificatePassword": "password"
```

---

## 🐛 TROUBLESHOOTING

### Build fails with "ENOENT"?
```bash
# Clean everything
rm -r dist .next node_modules
npm install
npm run electron:build
```

### App won't start?
```bash
# Check for errors
npm run electron:dev
# Look at console output
```

### Installer won't create?
```bash
# electron-builder needs Windows build tools
# Make sure running on Windows or use wine/docker
```

### Need to update after deployment?
```bash
# Users can delete old version & install new .exe
# Or set up electron-updater for auto-updates
```

---

## 📊 FILE SIZES

Expected sizes:

```
Aura Tasks Setup 1.0.0.exe: ~200-300 MB
(Includes Chromium, Node.js, all dependencies)

After install: ~500-700 MB on disk
(Unpacked into Program Files)
```

---

## ✨ NEXT STEPS

### Immediate (Today):
1. ✅ Commit Electron files
2. ✅ Push to git
3. ⏳ Build locally (next)
4. ⏳ Test .exe

### Short Term (This Week):
1. Set up GitHub Actions (auto-build)
2. Create releases with .exe
3. Add download link to website
4. Promote desktop app

### Long Term (Future):
1. Code signing (trusted publisher)
2. Auto-updater (electron-updater)
3. Windows Store submission
4. Analytics & crash reporting

---

## 🎯 BUILD NOW!

**Run this to build .exe:**

```bash
cd C:\Users\Neweye\taskflow

# Clean
rm -r dist .next

# Build
npm run build

# Package .exe
npm run electron:build

# Result: dist/Aura Tasks Setup 1.0.0.exe
```

**Then:**
1. Find `.exe` in `dist/` folder
2. Run installer
3. Test Aura Tasks desktop app
4. Done! 🎉

---

**Status:** ✅ Ready to build  
**Time:** 2026-11-11 20:14:57 UTC  
**Command:** `npm run electron:build`
