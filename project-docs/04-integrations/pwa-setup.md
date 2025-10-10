# PWA (Progressive Web App) Implementation

This document describes the PWA implementation in the astro-kit project.

## Overview

The project now includes full PWA support with:

- **Web App Manifest** for installability
- **Service Worker** for offline functionality and caching
- **App Icons** in multiple sizes for various devices
- **Install Prompt** that appears when the app is installable (can be disabled via environment variable)
- **Offline Indicator** to show connection status
- **Offline Fallback Page** for when users are offline
- **Environment-based Control** for enabling/disabling PWA features

## Environment Configuration

### PWA_ENABLED Environment Variable

The PWA install prompt can be controlled via the `PWA_ENABLED` environment variable:

```bash
# Enable PWA install prompt (default for production)
PWA_ENABLED=true

# Disable PWA install prompt (recommended for development)
PWA_ENABLED=false
```

**Default Behavior:**

- If `PWA_ENABLED` is not set or is any value other than `"true"`, the PWA install prompt will not appear
- This provides a fail-safe approach to prevent unwanted PWA prompts in development environments

**Usage in Different Environments:**

- **Development**: Set `PWA_ENABLED=false` to avoid PWA installation prompts during development
- **Staging**: Can be disabled (`PWA_ENABLED=false`) for stakeholder reviews without install prompts
- **Production**: Set `PWA_ENABLED=true` to enable the full PWA experience for end users

### Setting Up Environment Variables

1. **Copy the example environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure PWA settings in `.env`:**

   ```bash
   # PWA Configuration
   PWA_ENABLED=true
   ```

3. **Environment-specific configurations:**

   ```bash
   # Development
   PWA_ENABLED=false

   # Staging
   PWA_ENABLED=false

   # Production
   PWA_ENABLED=true
   ```

## Features

### 🚀 Installability

- Users can install the app on their devices (mobile and desktop)
- Custom install prompt appears when the app meets PWA criteria
- App appears in app drawers and home screens

### 📱 App Icons

- Generated icons in sizes: 16x16, 32x32, 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- PNG format for primary icons (192x192, 512x512)
- SVG format for scalable versions
- Based on the Astro logo with a dark theme color (#1e293b)

### 🔄 Service Worker

- Automatically generated using Workbox
- Precaches all static assets (JS, CSS, images, fonts)
- Cache-first strategy for static resources
- Network-first strategy for dynamic content
- Background updates with automatic refresh

### 🌐 Offline Support

- Offline indicator shows connection status
- Offline fallback page with helpful actions
- Cached pages work offline
- Auto-reload when connection is restored

## Technical Implementation

### Dependencies Added

```json
{
  "@vite-pwa/astro": "^1.1.0",
  "workbox-core": "^latest",
  "workbox-precaching": "^latest",
  "workbox-routing": "^latest",
  "workbox-strategies": "^latest",
  "sharp": "^latest"
}
```

### Configuration

The PWA is configured in `astro.config.mjs`:

```javascript
import AstroPWA from '@vite-pwa/astro'

export default defineConfig({
  integrations: [
    // ... other integrations
    AstroPWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
      },
      manifest: {
        name: 'Astro Kit - Component Library & Demo',
        short_name: 'AstroKit',
        description:
          'A collection of reusable Astro components and utilities for building content-rich websites',
        theme_color: '#1e293b',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
```

### Generated Files

When built, the PWA generates:

- `manifest.webmanifest` - Web app manifest
- `sw.js` - Service worker with Workbox
- `registerSW.js` - Service worker registration script
- `workbox-*.js` - Workbox runtime

### Components

#### PWAInstallPrompt

Location: `src/components/astro/PWAInstallPrompt.astro`

- Shows when app is installable
- Handles install prompt events
- Remembers if user dismissed
- Auto-hides after installation

#### OfflineIndicator

Location: `src/components/astro/OfflineIndicator.astro`

- Shows red banner when offline
- Shows green banner briefly when back online
- Listens to browser online/offline events

#### Offline Page

Location: `src/pages/offline.astro`

- Fallback page for offline navigation
- Helpful actions and status
- Auto-reload when connection restored

## Browser Support

The PWA works in all modern browsers:

- ✅ Chrome/Edge (full support)
- ✅ Firefox (service worker, limited install)
- ✅ Safari (service worker, limited install)
- ✅ Mobile browsers

## Testing

### Development

```bash
npm run build
npm run preview  # Note: Use serve for static testing
```

### PWA Compliance

1. Open Chrome DevTools
2. Go to Application > Manifest
3. Check for manifest errors
4. Go to Application > Service Workers
5. Test offline mode in Network tab
6. Run Lighthouse PWA audit

### Lighthouse PWA Criteria

The app should meet these requirements:

- ✅ Web app manifest
- ✅ Service worker
- ✅ Icons 192px and 512px
- ✅ Theme color
- ✅ Viewport meta tag
- ✅ HTTPS (in production)

## Usage Examples

### Install Button

```astro
---
import PWAInstallPrompt from '#components/astro/PWAInstallPrompt.astro'
---

<PWAInstallPrompt />
```

### Offline Status

```astro
---
import OfflineIndicator from '#components/astro/OfflineIndicator.astro'
---

<OfflineIndicator />
```

## Future Enhancements

Potential improvements:

- Push notifications for blog updates
- Background sync for contact forms
- Advanced caching strategies for content collections
- PWA update notifications
- Analytics for PWA usage

## Troubleshooting

### Common Issues

**Install prompt not showing:**

- Check `PWA_ENABLED` environment variable is set to `"true"`
- Check HTTPS is enabled
- Verify manifest has no errors
- Ensure service worker is registered
- Check browser support

**PWA prompt appearing in development:**

- Set `PWA_ENABLED=false` in your `.env` file
- Restart the development server after changing environment variables

**Service worker not updating:**

- Clear browser cache
- Check for console errors
- Verify Workbox configuration

**Icons not appearing:**

- Check icon file paths
- Verify icon sizes in manifest
- Test different icon formats

### Debug Commands

```bash
# Check service worker registration
console.log('SW registered:', 'serviceWorker' in navigator)

# Check manifest
console.log('Manifest:', await navigator.serviceWorker.ready)

# Check PWA environment variable
console.log('PWA Enabled:', import.meta.env.PWA_ENABLED)

# Test offline mode
// In DevTools Network tab, select "Offline"
```

## Links

- [Vite PWA Documentation](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
