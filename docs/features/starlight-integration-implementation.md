# Starlight Integration Implementation Plan for Astro-Basics

## Executive Summary

This document outlines the comprehensive plan for integrating Astro Starlight documentation framework into the astro-basics project. Starlight will enhance the existing documentation system with a modern, feature-rich documentation experience while maintaining compatibility with the current architecture.

## Current State Analysis

### Existing Documentation Structure

- **Content Collections**: Three collections (posts, docs, content) sharing identical schema
- **Current Docs Path**: `/src/content/docs/` with MDX files
- **Routing**: Custom routes at `/docs/[...slug].astro`
- **Features**: MDX support, syntax highlighting, tags, breadcrumbs
- **Authentication**: Clerk integration for protected routes
- **Database**: Supabase/Turso for comments system

### Key Considerations

1. **Server-Side Rendering**: Project uses `output: "server"` mode
2. **Existing Integrations**: Multiple integrations including Clerk, React, MDX, PWA
3. **Comment System**: Polymorphic comment system supporting docs
4. **Content Schema**: Custom schema with publish/featured flags
5. **Component Library**: Project exports components via package.json

## Integration Strategy

### Phase 1: Parallel Implementation (Recommended)

Run Starlight alongside existing docs system to minimize disruption:

- Mount Starlight at `/guide/` or `/starlight/`
- Keep existing `/docs/` routes intact
- Gradual content migration
- A/B testing capability

### Phase 2: Full Migration (Optional Future Step)

Complete replacement of existing docs system with Starlight.

## Detailed Implementation Plan

### Step 1: Install Dependencies ✅ COMPLETED

```bash
npm install @astrojs/starlight
```

**Status**: ✅ **COMPLETED** - @astrojs/starlight v0.35.2 installed and imported in astro.config.mjs

### Step 2: Configure Starlight Integration 🔄 IN PROGRESS

**Current State**: Basic `starlight()` integration added but needs proper configuration for `/docs/guide/` structure.

#### Update `astro.config.mjs`:

**Required Configuration** (to replace current minimal `starlight()` call):

```javascript
starlight({
  title: 'Astro-Basics Guide',

  // Configure content to read from docs/guide directory
  base: '/guide',

  // Logo configuration
  logo: {
    src: './src/assets/logo.svg', // Add if logo exists
  },

  // Social links
  social: {
    github: 'https://github.com/shawn-sandy/astro-basics',
  },

  // Sidebar configuration for docs/guide structure
  sidebar: [
    {
      label: 'Getting Started',
      autogenerate: { directory: 'getting-started' },
    },
    {
      label: 'Components',
      autogenerate: { directory: 'components' },
    },
    {
      label: 'API Reference',
      autogenerate: { directory: 'api' },
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
```

**Next Steps for Configuration**:

1. Replace the current `starlight()` call in astro.config.mjs with the configuration above
2. Create the `/docs/guide/` directory structure
3. Add initial content files

**Note**: The current configuration uses `/guide` as the base path, meaning Starlight docs will be accessible at `/guide/*` URLs while the content files live in `/docs/guide/` directory.

### Step 3: Configure Content Collections

#### Option A: Separate Collection (Recommended for Phase 1)

Create new collection for Starlight docs in `src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

// Existing collections
const postsCollection = defineCollection({
  /* ... */
})
const astroKitDocs = defineCollection({
  /* ... */
})
const content = defineCollection({
  /* ... */
})

// New Starlight collection
const guide = defineCollection({
  loader: docsLoader(),
  schema: docsSchema({
    extend: z.object({
      // Add custom fields if needed
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      featured: z.boolean().default(false),
    }),
  }),
})

export const collections = {
  posts: postsCollection,
  docs: astroKitDocs, // Keep existing docs
  content: content,
  guide: guide, // New Starlight docs
}
```

#### Option B: Unified Collection (For Phase 2)

Migrate existing docs collection to use Starlight schema.

### Step 4: Directory Structure

Create new directory structure:

```
src/content/
├── docs/           # Existing docs (keep for now)
├── guide/          # New Starlight docs
│   ├── index.mdoc
│   ├── installation.mdoc
│   ├── components/
│   │   ├── header.mdoc
│   │   └── footer.mdoc
│   └── api/
│       ├── comments.mdoc
│       └── posts.mdoc
├── posts/
└── content/
```

### Step 5: Custom Components Integration

#### Create Custom Page Frame

`src/components/starlight/PageFrame.astro`:

```astro
---
import type { Props } from '@astrojs/starlight/props'
import Default from '@astrojs/starlight/components/PageFrame.astro'
import CommentsSection from '#components/astro/CommentsSection.astro'

const { props } = Astro.props
---

<Default {...props}>
  <slot />
  {/* Add comment system to Starlight pages */}
  <CommentsSection contentType="doc" contentId={props.id} contentTitle={props.entry.data.title} />
</Default>
```

### Step 6: Styling Integration

Create `src/styles/starlight-custom.scss`:

```scss
@use '../components/colors' as *;
@use '../components/typography' as *;

:root {
  // Map existing design tokens to Starlight
  --sl-color-accent: var(--primary-color);
  --sl-color-text: var(--text-color);
  --sl-color-bg: var(--background-color);

  // Typography
  --sl-font: var(--font-family-base);
  --sl-font-system-mono: var(--font-family-mono);

  // Spacing
  --sl-content-width: 72rem;
  --sl-sidebar-width: 18rem;
}

// Custom component styles
.sl-markdown-content {
  @include prose;
}
```

### Step 7: Authentication Integration

#### Protected Documentation Routes

Create middleware helper for Starlight routes:

```typescript
// src/utils/starlight-auth.ts
import { clerkClient } from '@clerk/astro/server'

export async function checkDocAccess(userId: string, docPath: string) {
  // Check if doc requires authentication
  const protectedPaths = ['/guide/api/', '/guide/admin/']

  if (protectedPaths.some(path => docPath.startsWith(path))) {
    if (!userId) return false

    // Additional permission checks
    const user = await clerkClient.users.getUser(userId)
    return user.publicMetadata?.role === 'developer'
  }

  return true
}
```

### Step 8: Migration Script

Create content migration utility:

```javascript
// scripts/migrate-docs-to-starlight.js
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

async function migrateDocs() {
  const docsDir = './src/content/docs'
  const guideDir = './src/content/guide'

  const files = await fs.readdir(docsDir)

  for (const file of files) {
    if (file.endsWith('.mdx')) {
      const content = await fs.readFile(path.join(docsDir, file), 'utf-8')
      const { data, content: body } = matter(content)

      // Transform frontmatter
      const starlightFrontmatter = {
        title: data.title,
        description: data.description,
        // Map custom fields
        sidebar: {
          label: data.title,
          order: parseInt(file.split('-')[0]) || 0,
        },
        // Keep custom fields
        author: data.author,
        tags: data.tags,
      }

      // Write to new location
      const newContent = matter.stringify(body, starlightFrontmatter)
      await fs.writeFile(path.join(guideDir, file.replace('.mdx', '.mdoc')), newContent)
    }
  }
}
```

### Step 9: Search Integration

Configure Starlight's built-in search with existing site search:

```javascript
starlight({
  // ... other config
  search: {
    provider: 'pagefind',
    pagefind: {
      // Include additional content
      additionalIndexes: [
        { path: '/posts', selector: '.post-content' },
        { path: '/content', selector: '.content-body' },
      ],
    },
  },
})
```

### Step 10: API Documentation

Leverage Starlight's API documentation features:

````markdown
---
title: Comments API
description: RESTful API for the comment system
---

import { Tabs, TabItem } from '@astrojs/starlight/components'

## Endpoints

<Tabs>
  <TabItem label="GET">
    ```http
    GET /api/comments?contentType=post&contentId=123
    ```
  </TabItem>
  <TabItem label="POST">
    ```http
    POST /api/comments
    Content-Type: application/json
    
    {
      "content": "Great article!",
      "contentType": "post",
      "contentId": "123"
    }
    ```
  </TabItem>
</Tabs>
````

## Implementation Timeline

### Week 1: Setup & Configuration

- [ ] Install Starlight dependencies
- [ ] Configure astro.config.mjs
- [ ] Set up content collections
- [ ] Create directory structure

### Week 2: Component Integration

- [ ] Build custom PageFrame component
- [ ] Integrate comment system
- [ ] Apply custom styling
- [ ] Set up authentication checks

### Week 3: Content Migration

- [ ] Create migration scripts
- [ ] Migrate priority documentation
- [ ] Set up redirects for old URLs
- [ ] Update internal links

### Week 4: Testing & Optimization

- [ ] Test all documentation routes
- [ ] Verify authentication flow
- [ ] Check mobile responsiveness
- [ ] Performance optimization
- [ ] SEO validation

## Testing Strategy

### Unit Tests

```typescript
// tests/starlight-integration.test.ts
import { describe, it, expect } from 'vitest'
import { checkDocAccess } from '#utils/starlight-auth'

describe('Starlight Authentication', () => {
  it('should allow public access to guide', async () => {
    const hasAccess = await checkDocAccess(null, '/guide/')
    expect(hasAccess).toBe(true)
  })

  it('should require auth for API docs', async () => {
    const hasAccess = await checkDocAccess(null, '/guide/api/')
    expect(hasAccess).toBe(false)
  })
})
```

### E2E Tests

```typescript
// e2e/starlight-docs.spec.ts
import { test, expect } from '@playwright/test'

test('Starlight documentation loads', async ({ page }) => {
  await page.goto('/guide/')
  await expect(page.locator('h1')).toContainText('Documentation')

  // Test sidebar navigation
  await page.click('text=Installation')
  await expect(page).toHaveURL('/guide/installation/')

  // Test search
  await page.fill('[data-pagefind-ui] input', 'components')
  await expect(page.locator('.pagefind-ui__result')).toBeVisible()
})
```

## Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback**: Remove Starlight from integrations array
2. **Partial Rollback**: Keep Starlight but redirect all `/guide/*` to `/docs/*`
3. **Data Preservation**: All content remains in version control

## Success Metrics

### Performance Targets

- Documentation page load: < 2s
- Search response time: < 500ms
- Lighthouse score: > 95

### User Experience

- Reduced documentation bounce rate by 20%
- Increased average session duration by 30%
- Improved search usage by 50%

## Risks & Mitigations

| Risk                           | Impact | Mitigation                         |
| ------------------------------ | ------ | ---------------------------------- |
| Breaking existing docs         | High   | Parallel implementation strategy   |
| Performance degradation        | Medium | Monitor metrics, optimize bundle   |
| SEO impact                     | Medium | Maintain redirects, update sitemap |
| Comment system incompatibility | Low    | Custom component integration       |

## Post-Implementation Tasks

1. **Documentation Updates**

   - Update README.md with Starlight info
   - Add Starlight to CLAUDE.md
   - Create contributor guide for docs

2. **Monitoring Setup**

   - Track documentation analytics
   - Monitor error rates
   - Set up performance alerts

3. **Team Training**
   - Create Starlight authoring guide
   - Document component usage
   - Set up review process

## Conclusion

Integrating Starlight into astro-basics will provide a modern, searchable, and feature-rich documentation experience while maintaining the existing component library and authentication systems. The parallel implementation approach minimizes risk and allows for gradual migration and testing.

The implementation preserves all existing functionality including:

- Clerk authentication integration
- Comment system for documentation
- Server-side rendering
- PWA capabilities
- Component library exports

This plan ensures a smooth transition with minimal disruption to current users and developers.
