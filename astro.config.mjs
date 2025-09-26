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

import starlight from '@astrojs/starlight'

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  integrations: [
    react(),
    sitemap(),
    embeds(),
    starlight({
      title: 'Astro-Basics Guide',

      // Social links (array format for v0.35.2)
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/shawn-sandy/astro-basics',
        },
      ],

      // Sidebar configuration for src/content/docs/guide structure
      sidebar: [
        {
          label: 'Guide',
          items: [{ label: 'Welcome', link: '/guide/' }],
        },
        {
          label: 'Getting Started',
          autogenerate: { directory: 'guide/getting-started' },
        },
        {
          label: 'Components',
          autogenerate: { directory: 'guide/components' },
        },
        {
          label: 'API Reference',
          autogenerate: { directory: 'guide/api' },
        },
        {
          label: 'MCP Servers',
          items: [
            { label: 'Overview', link: '/guide/mcp/' },
            { label: 'Setup & Configuration', link: '/guide/mcp/setup' },
            {
              label: 'Servers',
              collapsed: false,
              items: [
                { label: 'Astro Docs', link: '/guide/mcp/servers/astro-docs' },
                { label: 'Supabase', link: '/guide/mcp/servers/supabase' },
                { label: 'Playwright', link: '/guide/mcp/servers/playwright' },
                { label: 'Clerk', link: '/guide/mcp/servers/clerk' },
                { label: 'Figma', link: '/guide/mcp/servers/figma' },
              ],
            },
            { label: 'Usage Examples', link: '/guide/mcp/examples' },
            { label: 'Troubleshooting', link: '/guide/mcp/troubleshooting' },
          ],
        },
      ],

      // Custom styling
      customCss: ['./src/styles/starlight-custom.scss'],

      // Enable features
      editLink: {
        baseUrl: 'https://github.com/shawn-sandy/astro-basics/edit/main/',
      },
      lastUpdated: true,
      pagination: true,
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 3,
      },
    }),
    mdx(),
    clerk(),
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
      host: process.env.EXPOSE_DEV_SERVER === 'true' ? true : 'localhost',
      allowedHosts: ['476cd5383d8f.ngrok-free.app'],
    },
    ssr: {
      noExternal: ['astro-imagetools'],
    },
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
