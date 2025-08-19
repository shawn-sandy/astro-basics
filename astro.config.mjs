import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import netlify from '@astrojs/netlify'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'
import embeds from 'astro-embed/integration'
import AstroPWA from '@vite-pwa/astro'

import node from '@astrojs/node'
import clerk from '@clerk/astro'

/**
 * Creates the integrations array with Clerk integration
 * Note: Environment variables are not available during config evaluation,
 * so we always include Clerk and let the runtime handle validation
 */
function createIntegrations() {
  const baseIntegrations = [
    react(),
    sitemap(),
    embeds(),
    mdx(),
    clerk(), // Always include Clerk - validation happens at runtime
  ]
  
  return baseIntegrations
}

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  integrations: [
    ...createIntegrations(),
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
  output: 'server',
  vite: {
    server: {
      host: true,
      allowedHosts: ['476cd5383d8f.ngrok-free.app']
    },
    ssr: {
      noExternal: ['astro-imagetools']
    }
  },
  // Choose adapter based on deployment target
  adapter: (() => {
    const adapter = process.env.ASTRO_ADAPTER
    switch (adapter) {
      case 'node':
        return node({ mode: 'standalone' })
      case 'vercel':
        return vercel()
      case 'netlify':
        return netlify()
      default:
        // Default to netlify for production builds
        return netlify()
    }
  })(),
})
