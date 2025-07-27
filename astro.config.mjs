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

import lighthouse from 'astro-lighthouse'

import node from '@astrojs/node'
import clerk from '@clerk/astro'

// https://astro.build/config
export default defineConfig({
  site: 'https://example.com',
  integrations: [react(), sitemap(), lighthouse(), embeds(), mdx(), clerk(), astroImageTools],
  output: 'server',
  // Choose adapter based on deployment target
  adapter: (() => {
    const adapter = process.env.ASTRO_ADAPTER
    if (adapter === 'node') {
      return node({ mode: 'standalone' })
    } else if (adapter === 'vercel') {
      return vercel()
    } else if (adapter === 'netlify') {
      return netlify()
    } else if (process.env.NODE_ENV === 'development') {
      return node({ mode: 'standalone' })
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
