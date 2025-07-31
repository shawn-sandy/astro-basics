import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import remarkToc from 'remark-toc'
import { rehypeAccessibleEmojis } from 'rehype-accessible-emojis'
import netlify from '@astrojs/netlify'
import vercel from '@astrojs/vercel'
import sitemap from '@astrojs/sitemap'
import embeds from 'astro-embed/integration'
// import spotlightjs from "@spotlightjs/astro";
import { astroImageTools } from 'astro-imagetools'
import AstroPWA from '@vite-pwa/astro'

import lighthouse from 'astro-lighthouse'

import node from '@astrojs/node'
import clerk from '@clerk/astro'

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    react(),
    sitemap(),
    lighthouse(),
    embeds(),
    mdx(),
    clerk(),
    astroImageTools,
    AstroPWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
      },
      manifest: {
        name: 'Astro Kit - Component Library & Demo',
        short_name: 'AstroKit',
        description: 'A collection of reusable Astro components and utilities for building content-rich websites',
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
  // Choose adapter based on deployment target
  adapter: (() => {
    // Force node adapter for development/testing
    if (process.env.NODE_ENV === 'development' || process.env.CI === 'true') {
      return node({ mode: 'standalone' })
    }
    
    const adapter = process.env.ASTRO_ADAPTER
    if (adapter === 'node') {
      return node({ mode: 'standalone' })
    } else if (adapter === 'vercel') {
      return vercel()
    } else if (adapter === 'netlify') {
      return netlify()
    } else if (process.env.NODE_ENV === 'production') {
      // Ensure a fallback for production if no valid adapter is set
      return netlify()
    } else if (!adapter) {
      // Default to netlify when no adapter is defined
      return netlify()
    } else {
      throw new Error(
        'Invalid adapter configuration. Set ASTRO_ADAPTER to "node", "netlify", or "vercel".'
      )
    }
  })(),
})
