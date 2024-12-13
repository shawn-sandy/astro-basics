import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import remarkToc from "remark-toc";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import netlify from "@astrojs/netlify";
import sitemap from "@astrojs/sitemap";
import embeds from "astro-embed/integration";
import spotlightjs from "@spotlightjs/astro";
import { astroImageTools } from "astro-imagetools";

import lighthouse from "astro-lighthouse";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  integrations: [
    react(),
    sitemap(),
    lighthouse(),
    embeds(),
    mdx(),
    astroImageTools,
  ],
  adapter: netlify(),
  output: "static",
});
