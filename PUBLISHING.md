# 📱 Publishing Aether to the App Store & Play Store

Aether is now an **installable PWA**. That means:

- ✅ Users on **any phone** can install it straight from the browser (Add to Home Screen) — no store needed.
- ✅ It works offline (after first load), launches in standalone mode, and feels like a native app.
- ⚠️ A PWA by itself is **not** an `.apk` or `.ipa`. To publish to **Google Play** or the **Apple App Store**, you must wrap the PWA in a native shell. This guide covers both routes.

---

## 0. Prerequisites

1. **Deploy the app to a public HTTPS URL** (e.g. `https://aether.app` or your Vercel URL). PWAs require HTTPS.
2. Verify the manifest works:
   - Open the site in Chrome → DevTools → **Application → Manifest**. You should see the Aether icon, name, and `display: standalone`.
   - On mobile Chrome, you should get an "Install app" prompt in the menu.
3. Make sure the icons in `/public/icon-192.png` and `/public/icon-512.png` look right.

---

## 🤖 Option A — Google Play Store (recommended path: PWABuilder → TWA)

Google supports **Trusted Web Activities (TWA)**: a thin Android wrapper around your PWA. The easiest builder is [PWABuilder](https://www.pwabuilder.com).

### Step 1 — Generate the Android package
1. Go to <https://www.pwabuilder.com>.
2. Enter your deployed URL (e.g. `https://aether.app`) → **Start**.
3. PWABuilder scores your PWA. Fix any red items it flags (most should already pass).
4. Click **Package For Stores → Android → Generate Package**.
5. Fill in:
   - **Package ID**: `app.aether.android` (or your reverse-domain id — must be unique on Play)
   - **App name**: `Aether`
   - **Launcher name**: `Aether`
   - **Theme / background colors**: `#0a0a0f`
   - **Signing key**: choose **"Create new"** the first time. **Download and back up** the `.keystore` file and passwords — you cannot update the app on Play without them.
6. Download the ZIP. It contains:
   - `app-release-bundle.aab` ← this is what you upload to Play
   - `app-release-signed.apk` ← for direct install / sideload testing
   - `assetlinks.json` ← **must be hosted at `https://YOUR_DOMAIN/.well-known/assetlinks.json`** so Android trusts your PWA. Drop it in `/public/.well-known/assetlinks.json` and redeploy.

### Step 2 — Create a Play Console listing
1. Sign up at <https://play.google.com/console> ($25 one-time fee).
2. **Create app** → fill in name, default language, app/game, free/paid.
3. Complete the required sections in the left sidebar:
   - **App content**: privacy policy URL, ads, content rating, target audience, data safety.
   - **Main store listing**: short + full description, screenshots (min 2 phone screenshots, 1080×1920 recommended), feature graphic 1024×500, app icon 512×512 (use `/public/icon-512.png`).
4. **Production → Create new release** → upload the `.aab` from PWABuilder.
5. Submit for review. Approval typically takes **a few hours to a few days**.

### Step 3 — Verify Digital Asset Links
After deploy, test:
```
curl https://YOUR_DOMAIN/.well-known/assetlinks.json
```
It must return JSON. If it doesn't, the app will show a URL bar at the top (proof you forgot this step).

---

## 🍎 Option B — Apple App Store (path: PWABuilder iOS wrapper or Capacitor)

Apple does **not** natively support PWAs in the App Store, so you need a wrapper. Two routes:

### Route B1 — PWABuilder iOS package (simplest)
1. On <https://www.pwabuilder.com>, after entering your URL, choose **Package For Stores → iOS → Generate Package**.
2. Fill in:
   - **Bundle ID**: `app.aether.ios` (reverse-domain, must match what you register in Apple Developer)
   - **App name**: `Aether`
   - **URL**: your deployed HTTPS URL
3. Download the ZIP — it contains an Xcode project.
4. **You must have a Mac with Xcode** to continue. Open the `.xcworkspace`.
5. In Xcode → **Signing & Capabilities** → select your Apple Developer team.
6. **Product → Archive** → **Distribute App → App Store Connect → Upload**.

### Route B2 — Capacitor (more control, recommended if you want push, camera, etc.)
1. Export the project to your own GitHub via Lovable's GitHub button, then `git clone` and `npm install`.
2. Install Capacitor:
   ```bash
   npm i @capacitor/core @capacitor/ios
   npm i -D @capacitor/cli
   npx cap init Aether app.aether.ios --web-dir=dist
   npm run build
   npx cap add ios
   npx cap sync
   npx cap open ios
   ```
3. Xcode opens — sign with your Apple Developer team, archive, upload.

### Step — App Store Connect listing
1. Sign up at <https://developer.apple.com> ($99/year).
2. Go to <https://appstoreconnect.apple.com> → **My Apps → +**.
3. Register the **Bundle ID** (must match the wrapper).
4. Fill in:
   - Name, subtitle, description, keywords, support URL, privacy policy URL.
   - **Screenshots**: 6.7" iPhone (1290×2796) and 6.5" iPhone (1284×2778) are required at minimum.
   - **App icon** comes from the Xcode asset catalogue (1024×1024, no transparency, no rounded corners — Apple rounds them).
   - **App Privacy** — declare what you collect (auth email, etc.).
5. Submit for review. Apple review typically takes **24–48 hours**.

### ⚠️ Apple-specific gotchas
- Apple often **rejects "thin wrapper" apps** that just load a website (Guideline 4.2). To pass review, make sure the app:
  - Has clear native value (offline mode, install prompt, push, etc. — your PWA already does most of this).
  - Has its own privacy policy URL.
  - Uses actual app icons + splash screens (PWABuilder/Capacitor configures these).

---

## 🧪 Testing before submission

| Platform | How to test |
|---|---|
| **Android (sideload)** | `adb install app-release-signed.apk` from the PWABuilder ZIP |
| **Android (Play internal)** | Upload the `.aab` to a **Closed testing** track in Play Console |
| **iOS (TestFlight)** | After Xcode upload, add testers in App Store Connect → TestFlight |

---

## 🔄 Updating the app

The huge advantage of a TWA / PWA wrapper: **most updates ship instantly without a store review** — you just redeploy the web app. You only need to submit a new `.aab` / `.ipa` when:
- You change the app name, icon, package id, or required Android/iOS permissions.
- Apple/Google requires a target SDK bump (~once a year).

---

## 📦 What's in this repo for PWA

- `public/manifest.webmanifest` — install metadata
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — app icons
- `vite.config.ts` — `vite-plugin-pwa` config (service worker)
- `src/main.tsx` — guarded SW registration (never runs inside Lovable preview/iframes)
- `index.html` — manifest link + iOS / theme meta tags

---

## ❓ FAQ

**Do I need PWABuilder or can I just publish the PWA?**
Browsers can install a PWA directly with no store. You only need PWABuilder/Capacitor if you want it **listed on Play / App Store**.

**Will my Lovable Cloud auth still work inside the wrapped app?**
Yes — the wrapper is just a browser. Google OAuth / email auth work the same. Make sure your Supabase redirect URLs include your final published domain.

**Can I do this without a Mac?**
Android: yes. iOS: no — Apple requires Xcode on macOS to build & upload. Alternatives: rent a Mac in the cloud (MacInCloud, MacStadium) or use a CI service (Codemagic, Bitrise, EAS Build).
