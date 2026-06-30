# Marco's Pizzeria — installable PWA → Google Play `.aab`

This folder is a **valid, installable PWA**. It is **not** the `.aab` — it's the
web app that a cloud builder turns into one. No tool inside Claude's environment
can compile/sign an Android bundle (Google's Android SDK + Maven repos are
network-blocked here), so the build happens in the cloud in ~10 minutes. No Mac,
no domain needed.

## Get the `.aab` (3 steps)

### 1. Put this online (instant, free)
- Unzip this folder.
- Go to **https://app.netlify.com/drop** and drag the **whole folder** onto the page.
- You get a live HTTPS link immediately, e.g. `https://marco-xxxx.netlify.app`.
  (You can attach `order.mymarco.co.uk` later — not needed for the build.)

### 2. Build the bundle — https://pwabuilder.com
- Paste the Netlify link → **Package For Stores → Android → Google Play**.
- Open **Options** and set, exactly:
  - **Package ID** = `uk.co.mymarco.myapp`   ← the field Google's red error checks
  - **App name** = `Marco's Pizzeria`
  - **Version** = `1.0.0`, **Version code** = `1`
  - **Signing key** = **Create new** (Generate)
- **Generate → Download.**

### 3. Upload
- In the download, **`app-release-signed.aab`** is the file → upload it to
  **Internal testing** on the exact screen in your screenshot. The package-name
  error clears because the bundle now genuinely carries `uk.co.mymarco.myapp`.
- **Keep `signing.keystore`** (and its passwords) from the download — you need the
  *same* key for every future update. Losing it means you can't update the app.
- PWABuilder also gives an **`assetlinks.json`** — host it at
  `https://order.mymarco.co.uk/.well-known/assetlinks.json` once your domain is
  live, so the app runs full-screen with no URL bar. A placeholder is in
  `.well-known/assetlinks.json` here (replace the fingerprint with the one
  PWABuilder/Play Console shows).

## Important — what this gets you (and what it doesn't)
- ✅ A correctly-named, signed app **shell** in Google Play testing **today**.
- ⚠️ It is a **TWA** — a thin wrapper that loads your live URL. Right now that URL
  shows this branded splash, **not** a working ordering app. The real storefront
  (built against your Base44 "Marco's Express" backend) slots in behind the same
  URL later, and the app updates itself — **no re-upload** unless you change the
  package name, icon, or add native features.

So: use this to reserve the listing and clear the error now. Build the real
storefront next, deploy it to the same URL, and the app becomes the real thing.
