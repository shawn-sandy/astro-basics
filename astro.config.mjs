import mdx from "@astrojs/mdx";
import netlify from "@astrojs/netlify";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import spotlightjs from "@spotlightjs/astro";
import embeds from "astro-embed/integration";
import { defineConfig } from "astro/config";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import keystatic from "@keystatic/astro";
import lighthouse from "astro-lighthouse";
import remarkToc from "remark-toc";

import markdoc from "@astrojs/markdoc";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  integrations: [react(), sitemap(), spotlightjs(), lighthouse(), embeds(), mdx(), keystatic(), markdoc()],
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