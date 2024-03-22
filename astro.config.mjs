import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";

import lighthouse from "astro-lighthouse";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  integrations: [react(), mdx(), sitemap(), spotlightjs(), lighthouse()],
  adapter: netlify(),
  output: "hybrid",
  // Enable Custom Markdown options, plugins, etc.
  markdown: {
    syntaxHighlight: "shiki",
    remarkPlugins: [remarkToc],
    rehypePlugins: [rehypeAccessibleEmojis],
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true
    }
  }
});