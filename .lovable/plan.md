

## Plan: Add PWA (Add to Home Screen) support with Socialify branding

### What we'll do
Set up the app as a Progressive Web App so mobile users can install it to their home screen with the "Socialify DB" name and the Socialify logo.

### Steps

1. **Save the logo** as `public/logo-192.png` and `public/logo-512.png` (decode the base64 image provided and copy it to public/).

2. **Install `vite-plugin-pwa`** and configure it in `vite.config.ts` with:
   - App name: "Socialify DB"
   - Short name: "Socialify"
   - Theme color matching the brand
   - Icons: 192x192 and 512x512 from the provided logo
   - `navigateFallbackDenylist: [/^\/~oauth/]` to avoid caching OAuth routes
   - Display: "standalone"

3. **Update `index.html`** with mobile meta tags:
   - `<meta name="theme-color">`
   - `<link rel="apple-touch-icon">` pointing to the logo
   - `<meta name="apple-mobile-web-app-capable">`
   - `<meta name="apple-mobile-web-app-title" content="Socialify DB">`

4. **Create `public/manifest.webmanifest`** (or let vite-plugin-pwa generate it) with proper name, icons, start_url, display, and colors.

### Result
Users on mobile will get the browser's "Add to Home Screen" prompt (or can manually add it). The installed app will show the Socialify logo as the icon and "Socialify DB" as the app name.

