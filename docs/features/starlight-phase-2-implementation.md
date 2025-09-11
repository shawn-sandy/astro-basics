# Starlight Phase 2: Enhanced Integration & Content Migration

## Executive Summary

Phase 2 of the Starlight integration builds upon the successful Phase 1 foundation to create a comprehensive,
interactive documentation system for the astro-basics project. With Starlight v0.35.2 fully integrated and
operational, Phase 2 focuses on content migration, advanced features, and enhanced developer experience.

## Phase 1 Recap

**✅ Successfully Completed:**

- Starlight v0.35.2 installation and configuration
- Content collection schema integration with docsSchema
- Custom SCSS theming matching existing design system
- Directory structure at `src/content/docs/guide/`
- Initial documentation pages (welcome, installation, components overview)
- Search functionality with Pagefind integration
- Navigation, table of contents, and responsive design

**Current Status:** Starlight documentation is live at `/guide/` routes with all core features functional.

## Phase 2 Objectives

### 🎯 Primary Goals

1. **Content Migration** - Complete migration of existing documentation to Starlight format
2. **Interactive Components** - Build component playground with live examples
3. **API Documentation** - Comprehensive API reference with TypeScript integration
4. **Advanced Features** - Enhanced search, analytics, and internationalization
5. **Developer Experience** - Authoring tools, automation, and validation workflows
6. **System Integration** - Deep integration with existing comment and authentication systems

### 📊 Success Metrics

- **Content Coverage**: 100% of existing docs migrated to Starlight
- **Component Documentation**: All 50+ components documented with interactive examples
- **Search Performance**: 95% search success rate with enhanced indexing
- **User Engagement**: 40% increase in documentation page views and session duration
- **Developer Velocity**: 30% reduction in component integration time for new developers

## Implementation Plan

### Step 1: Content Migration & Restructuring

#### 1.1 Content Architecture

Expand the documentation structure to provide comprehensive coverage:

```text
src/content/docs/guide/
├── index.mdx                        # Welcome page ✅ Complete
├── getting-started/
│   ├── index.mdx                   # Overview ✅ Complete
│   ├── installation.mdx            # Installation guide ✅ Complete
│   ├── configuration.mdx           # 🔄 Configuration setup
│   ├── development.mdx             # 🔄 Development workflow
│   ├── deployment.mdx              # 🔄 Deployment strategies
│   └── troubleshooting.mdx         # 🔄 Common issues
├── components/
│   ├── index.mdx                   # Component overview ✅ Complete
│   ├── astro/                      # 🔄 Astro components
│   │   ├── header.mdx             # Navigation header
│   │   ├── footer.mdx             # Site footer
│   │   ├── navigation.mdx         # Navigation components
│   │   ├── cards.mdx              # Card layouts
│   │   ├── forms.mdx              # Form components
│   │   └── layouts.mdx            # Page layouts
│   ├── react/                      # 🔄 React components
│   │   ├── interactive.mdx        # Interactive elements
│   │   ├── dashboard.mdx          # Dashboard components
│   │   ├── user-profile.mdx       # User management
│   │   └── data-display.mdx       # Charts and tables
│   └── showcase/                   # 🔄 Live examples
│       ├── gallery.mdx            # Component gallery
│       ├── playground.mdx         # Interactive playground
│       └── themes.mdx             # Theme examples
├── api/
│   ├── index.mdx                   # API overview ✅ Complete
│   ├── authentication.mdx          # 🔄 Clerk integration
│   ├── database.mdx               # 🔄 Supabase/Turso
│   ├── comments.mdx               # 🔄 Comment system API
│   ├── posts.mdx                  # 🔄 Content API
│   ├── utilities.mdx              # 🔄 Helper functions
│   └── webhooks.mdx               # 🔄 Webhook endpoints
├── guides/                         # 🔄 In-depth tutorials
│   ├── theming.mdx                # Theme customization
│   ├── testing.mdx                # Testing strategies
│   ├── performance.mdx            # Performance optimization
│   ├── security.mdx               # Security best practices
│   ├── accessibility.mdx          # A11y implementation
│   └── deployment.mdx             # Production deployment
├── reference/                      # 🔄 Technical reference
│   ├── configuration.mdx          # Config options
│   ├── cli.mdx                    # Command line tools
│   ├── environment.mdx            # Environment variables
│   ├── migrations.mdx             # Database migrations
│   └── troubleshooting.mdx        # Debug guide
└── examples/                       # 🔄 Code examples
    ├── basic-setup.mdx            # Simple implementation
    ├── advanced-features.mdx      # Complex use cases
    ├── integrations.mdx           # Third-party integrations
    └── custom-themes.mdx          # Theme development
```

#### 1.2 Migration Scripts

Create automated migration tools to convert existing content:

```javascript
// scripts/migrate-to-starlight.js
import { readdir, readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import matter from 'gray-matter'

async function migrateDocumentation() {
  const sourceDir = './backup-docs'
  const targetDir = './src/content/docs/guide'

  // Content mapping configuration
  const contentMap = {
    '0-welcome.mdx': 'index.mdx',
    '1-introduction.mdx': 'getting-started/overview.mdx',
    '2-customizing.mdx': 'guides/theming.mdx',
    '3-custom-navigation.mdx': 'components/astro/navigation.mdx',
    '4-development.mdx': 'getting-started/development.mdx',
  }

  for (const [sourceFile, targetPath] of Object.entries(contentMap)) {
    const sourcePath = join(sourceDir, sourceFile)
    const targetFullPath = join(targetDir, targetPath)

    try {
      const content = await readFile(sourcePath, 'utf-8')
      const { data: frontmatter, content: body } = matter(content)

      // Transform frontmatter for Starlight
      const starlightFrontmatter = {
        title: frontmatter.title,
        description: frontmatter.description,
        sidebar: {
          label: frontmatter.title,
          order: frontmatter.order || 0,
        },
        // Preserve custom fields
        ...(frontmatter.author && { author: frontmatter.author }),
        ...(frontmatter.tags && { tags: frontmatter.tags }),
        ...(frontmatter.featured && { featured: frontmatter.featured }),
      }

      // Transform content
      let transformedBody = body
        .replace(/^#\s+(.+)$/gm, '## $1') // Adjust heading levels
        .replace(/\]\(\/docs\//g, '](../') // Fix internal links
        .replace(/import.*from.*['"]#components/g, '') // Remove component imports

      // Create new content
      const newContent = matter.stringify(transformedBody, starlightFrontmatter)

      // Ensure directory exists
      await ensureDir(dirname(targetFullPath))

      // Write migrated content
      await writeFile(targetFullPath, newContent)
      console.log(`✅ Migrated: ${sourceFile} → ${targetPath}`)
    } catch (error) {
      console.error(`❌ Failed to migrate ${sourceFile}:`, error.message)
    }
  }
}

async function ensureDir(dirPath) {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
  }
}

// Run migration
migrateDocumentation().catch(console.error)
```

#### 1.3 Content Enhancement Templates

Create standardized templates for different content types:

```mdx
---
# Component Documentation Template
title: [Component Name]
description: [Brief component description]
status: stable | experimental | deprecated
version: '1.0.0'
lastUpdated: 2024-01-15
category: astro | react | layout | form
---

import { Tabs, TabItem, Badge, Code } from '@astrojs/starlight/components'
import ComponentPlayground from '../../../components/starlight/ComponentPlayground.astro'

# [Component Name] <Badge text={frontmatter.status} variant="success" />

[Component overview and purpose description]

## Quick Start

<ComponentPlayground 
  component="ComponentName"
  code={`---
import ComponentName from '#components/astro/ComponentName.astro'
---

<ComponentName prop="value" />
`} />

## API Reference

<Tabs>
  <TabItem label="Props">
    | Prop | Type | Default | Required | Description |
    |------|------|---------|----------|-------------|
    | `prop1` | `string` | `undefined` | ✅ | Description of prop1 |
    | `prop2` | `boolean` | `false` | ❌ | Description of prop2 |
  </TabItem>
  
  <TabItem label="Events">
    | Event | Payload | Description |
    |-------|---------|-------------|
    | `onChange` | `CustomEvent<T>` | Fired when value changes |
  </TabItem>
  
  <TabItem label="CSS Variables">
    | Variable | Default | Description |
    |----------|---------|-------------|
    | `--component-bg` | `#ffffff` | Background color |
    | `--component-border` | `#e2e8f0` | Border color |
  </TabItem>
</Tabs>

## Examples

### Basic Usage

<Code code={`<ComponentName title="Hello World" />`} lang="astro" title="Basic Example" />

### Advanced Configuration

<Code
  code={`<ComponentName 
  title="Advanced Example"
  variant="primary"
  size="large"
  disabled={false}
/>`}
  lang="astro"
  title="Advanced Example"
/>

## Accessibility

- [Accessibility considerations and ARIA attributes]
- [Keyboard navigation support]
- [Screen reader compatibility]

## Related Components

- [Link to related component 1]
- [Link to related component 2]
```

### Step 2: Interactive Component Documentation System

#### 2.1 Component Playground

Build an interactive playground for live component testing:

```astro
---
// src/components/starlight/ComponentPlayground.astro
import { Code } from '@astrojs/starlight/components'

export interface Props {
  component: string
  code: string
  props?: Record<string, any>
  editable?: boolean
  showCode?: boolean
}

const { component, code, props = {}, editable = false, showCode = true } = Astro.props

// Import component dynamically
const ComponentModule = await import(`#components/astro/${component}.astro`)
const Component = ComponentModule.default
---

<div class="component-playground" data-component={component}>
  <div class="playground-header">
    <h4>Live Preview</h4>
    <div class="playground-controls">
      <button class="reset-btn" data-action="reset">Reset</button>
      <button class="copy-btn" data-action="copy">Copy Code</button>
    </div>
  </div>

  <div class="playground-preview">
    <div class="preview-container">
      <!-- Live component rendering -->
      <Component {...props} />
    </div>
  </div>

  {
    showCode && (
      <div class="playground-code">
        <Code code={code} lang="astro" title="Component Code" />
      </div>
    )
  }

  {
    editable && (
      <div class="playground-editor">
        <textarea class="code-editor" data-code={code} placeholder="Edit component code here...">
          {code}
        </textarea>
        <button class="apply-btn" data-action="apply">
          Apply Changes
        </button>
      </div>
    )
  }
</div>

<style>
  .component-playground {
    border: 1px solid var(--sl-color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    margin: 2rem 0;
    background: var(--sl-color-bg);
  }

  .playground-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--sl-color-bg-sidebar);
    border-bottom: 1px solid var(--sl-color-border);
  }

  .playground-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--sl-color-text);
  }

  .playground-controls {
    display: flex;
    gap: 0.5rem;
  }

  .playground-controls button {
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--sl-color-border);
    border-radius: 0.375rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .playground-controls button:hover {
    background: var(--sl-color-accent-low);
    border-color: var(--sl-color-accent);
  }

  .playground-preview {
    padding: 2rem;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .preview-container {
    width: 100%;
    max-width: 100%;
  }

  .playground-code {
    border-top: 1px solid var(--sl-color-border);
  }

  .playground-editor {
    border-top: 1px solid var(--sl-color-border);
    padding: 1rem;
    background: var(--sl-color-bg-sidebar);
  }

  .code-editor {
    width: 100%;
    min-height: 120px;
    padding: 0.75rem;
    border: 1px solid var(--sl-color-border);
    border-radius: 0.375rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font-family: var(--sl-font-mono);
    font-size: 0.875rem;
    resize: vertical;
  }

  .apply-btn {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: var(--sl-color-accent);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-weight: 500;
  }

  .apply-btn:hover {
    background: var(--sl-color-accent-high);
  }

  @media (max-width: 768px) {
    .playground-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .playground-preview {
      padding: 1rem;
    }
  }
</style>

<script>
  // Add interactivity for playground controls
  document.addEventListener('DOMContentLoaded', () => {
    const playgrounds = document.querySelectorAll('.component-playground')

    playgrounds.forEach(playground => {
      const copyBtn = playground.querySelector('[data-action="copy"]')
      const resetBtn = playground.querySelector('[data-action="reset"]')
      const applyBtn = playground.querySelector('[data-action="apply"]')
      const editor = playground.querySelector('.code-editor')

      // Copy code functionality
      copyBtn?.addEventListener('click', async () => {
        const code = playground.querySelector('code')?.textContent
        if (code) {
          try {
            await navigator.clipboard.writeText(code)
            copyBtn.textContent = 'Copied!'
            setTimeout(() => (copyBtn.textContent = 'Copy Code'), 2000)
          } catch (err) {
            console.error('Failed to copy code:', err)
          }
        }
      })

      // Reset functionality
      resetBtn?.addEventListener('click', () => {
        const originalCode = editor?.dataset.code
        if (editor && originalCode) {
          editor.value = originalCode
        }
      })

      // Apply changes functionality (for editable playgrounds)
      applyBtn?.addEventListener('click', () => {
        // In a real implementation, this would re-render the component
        // with the new code from the editor
        console.log('Apply changes:', editor?.value)
      })
    })
  })
</script>
```

#### 2.2 Component Status System

Add component maturity and version tracking:

```astro
---
// src/components/starlight/ComponentStatus.astro
import { Badge } from '@astrojs/starlight/components'

export interface Props {
  status: 'stable' | 'experimental' | 'deprecated' | 'beta'
  version?: string
  since?: string
  deprecatedSince?: string
}

const { status, version, since, deprecatedSince } = Astro.props

const statusConfig = {
  stable: { variant: 'success', label: 'Stable' },
  experimental: { variant: 'caution', label: 'Experimental' },
  deprecated: { variant: 'danger', label: 'Deprecated' },
  beta: { variant: 'note', label: 'Beta' },
}

const config = statusConfig[status]
---

<div class="component-status">
  <Badge text={config.label} variant={config.variant} />

  {version && <span class="version">v{version}</span>}
  {since && <span class="since">Since v{since}</span>}
  {deprecatedSince && <span class="deprecated-info">Deprecated since v{deprecatedSince}</span>}
</div>

<style>
  .component-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1rem 0;
    padding: 0.75rem;
    background: var(--sl-color-bg-sidebar);
    border: 1px solid var(--sl-color-border);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .version {
    font-family: var(--sl-font-mono);
    color: var(--sl-color-text-accent);
    font-weight: 600;
  }

  .since {
    color: var(--sl-color-text);
    opacity: 0.8;
  }

  .deprecated-info {
    color: var(--sl-color-red);
    font-weight: 500;
  }
</style>
```

### Step 3: Advanced API Documentation

#### 3.1 TypeScript-Driven API Documentation

Generate API docs automatically from TypeScript interfaces:

```typescript
// src/types/api-documentation.ts

/**
 * Comment creation request payload
 * @public
 */
export interface CommentCreateRequest {
  /** The comment content (supports markdown) */
  content: string
  /** Content type that the comment belongs to */
  contentType: 'post' | 'doc' | 'page'
  /** Unique identifier of the content */
  contentId: string
  /** Parent comment ID for threaded discussions */
  parentId?: string
  /** Additional metadata for the comment */
  metadata?: Record<string, unknown>
}

/**
 * Comment response object
 * @public
 */
export interface CommentResponse {
  /** Unique comment identifier */
  id: string
  /** Comment content */
  content: string
  /** Comment author information */
  author: AuthorInfo
  /** Creation timestamp (ISO 8601) */
  createdAt: string
  /** Last update timestamp (ISO 8601) */
  updatedAt: string
  /** Nested reply comments */
  replies?: CommentResponse[]
  /** Comment status */
  status: 'active' | 'archived' | 'flagged'
  /** Vote count for the comment */
  votes: number
}

/**
 * Author information
 * @public
 */
export interface AuthorInfo {
  /** User unique identifier */
  id: string
  /** Display name */
  name: string
  /** Profile avatar URL */
  avatar?: string
  /** User role */
  role: 'user' | 'moderator' | 'admin'
}

/**
 * API error response
 * @public
 */
export interface ApiError {
  /** Error message */
  message: string
  /** Error code for programmatic handling */
  code: string
  /** Additional error details */
  details?: Record<string, unknown>
}
```

#### 3.2 Interactive API Explorer

Create interactive API documentation with live testing:

```astro
---
// src/components/starlight/ApiExample.astro
import { Tabs, TabItem, Code } from '@astrojs/starlight/components'

export interface Props {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  endpoint: string
  description?: string
  auth?: 'required' | 'optional' | 'none'
  request?: Record<string, any>
  response?: Record<string, any>
  headers?: Record<string, string>
  parameters?: Array<{
    name: string
    type: string
    required: boolean
    description: string
    default?: any
  }>
}

const {
  method,
  endpoint,
  description,
  auth = 'none',
  request,
  response,
  headers = {},
  parameters = [],
} = Astro.props

const methodColors = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
}

const authHeaders =
  auth === 'required'
    ? {
        Authorization: 'Bearer YOUR_API_KEY',
        ...headers,
      }
    : headers

const fullHeaders = {
  'Content-Type': 'application/json',
  ...authHeaders,
}
---

<div class="api-example" data-method={method} data-endpoint={endpoint}>
  <div class="api-header">
    <div class="method-endpoint">
      <span class="method" style={`background: ${methodColors[method]}`}>
        {method}
      </span>
      <code class="endpoint">{endpoint}</code>
    </div>

    {
      auth === 'required' && (
        <div class="auth-required">
          <span class="auth-badge">🔒 Auth Required</span>
        </div>
      )
    }
  </div>

  {description && <p class="api-description">{description}</p>}

  <Tabs>
    {
      parameters.length > 0 && (
        <TabItem label="Parameters">
          <div class="parameters-table">
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                  <th>Default</th>
                </tr>
              </thead>
              <tbody>
                {parameters.map(param => (
                  <tr>
                    <td>
                      <code>{param.name}</code>
                    </td>
                    <td>
                      <code>{param.type}</code>
                    </td>
                    <td>{param.required ? '✅' : '❌'}</td>
                    <td>{param.description}</td>
                    <td>{param.default ? <code>{JSON.stringify(param.default)}</code> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabItem>
      )
    }

    <TabItem label="Request">
      <div class="request-section">
        <h5>Headers</h5>
        <Code code={JSON.stringify(fullHeaders, null, 2)} lang="json" title="Request Headers" />

        {
          request && (
            <>
              <h5>Body</h5>
              <Code code={JSON.stringify(request, null, 2)} lang="json" title="Request Body" />
            </>
          )
        }

        <h5>cURL Example</h5>
        <Code
          code={`curl -X ${method} "${endpoint}" \\
  -H "Content-Type: application/json" \\${auth === 'required' ? '\n  -H "Authorization: Bearer YOUR_API_KEY" \\' : ''}${request ? `\n  -d '${JSON.stringify(request)}'` : ''}`}
          lang="bash"
          title="cURL Command"
        />
      </div>
    </TabItem>

    <TabItem label="Response">
      {
        response && (
          <Code code={JSON.stringify(response, null, 2)} lang="json" title="Response Body" />
        )
      }
    </TabItem>

    <TabItem label="Try It">
      <div class="api-tester">
        <form class="test-form" data-endpoint={endpoint} data-method={method}>
          {
            auth === 'required' && (
              <div class="form-group">
                <label for="api-key">API Key:</label>
                <input
                  type="password"
                  id="api-key"
                  name="apiKey"
                  placeholder="Enter your API key"
                  required
                />
              </div>
            )
          }

          {
            request && (
              <div class="form-group">
                <label for="request-body">Request Body:</label>
                <textarea
                  id="request-body"
                  name="requestBody"
                  rows="8"
                  placeholder="Enter JSON request body"
                >
                  {JSON.stringify(request, null, 2)}
                </textarea>
              </div>
            )
          }

          <button type="submit" class="test-button"> Send Request </button>
        </form>

        <div class="test-results" style="display: none;">
          <h5>Response:</h5>
          <pre class="response-output"></pre>
        </div>
      </div>
    </TabItem>
  </Tabs>
</div>

<style>
  .api-example {
    border: 1px solid var(--sl-color-border);
    border-radius: 0.75rem;
    margin: 2rem 0;
    overflow: hidden;
  }

  .api-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--sl-color-bg-sidebar);
    border-bottom: 1px solid var(--sl-color-border);
  }

  .method-endpoint {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .method {
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .endpoint {
    font-family: var(--sl-font-mono);
    font-size: 1rem;
    color: var(--sl-color-text);
    background: var(--sl-color-bg-inline-code);
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--sl-color-border);
  }

  .auth-badge {
    background: var(--sl-color-accent-low);
    color: var(--sl-color-accent);
    padding: 0.25rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .api-description {
    padding: 1rem 1.5rem;
    margin: 0;
    color: var(--sl-color-text);
    border-bottom: 1px solid var(--sl-color-border);
  }

  .parameters-table table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .parameters-table th,
  .parameters-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--sl-color-border);
  }

  .parameters-table th {
    background: var(--sl-color-bg-sidebar);
    font-weight: 600;
  }

  .request-section h5 {
    margin: 1.5rem 0 0.5rem 0;
    color: var(--sl-color-text);
    font-size: 1rem;
  }

  .request-section h5:first-child {
    margin-top: 0;
  }

  .api-tester {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--sl-color-text);
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--sl-color-border);
    border-radius: 0.375rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font-family: var(--sl-font-mono);
    font-size: 0.875rem;
  }

  .form-group textarea {
    resize: vertical;
    font-family: var(--sl-font-mono);
  }

  .test-button {
    background: var(--sl-color-accent);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .test-button:hover {
    background: var(--sl-color-accent-high);
  }

  .test-results {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--sl-color-border);
  }

  .response-output {
    background: var(--sl-color-bg-sidebar);
    padding: 1rem;
    border-radius: 0.375rem;
    border: 1px solid var(--sl-color-border);
    font-family: var(--sl-font-mono);
    font-size: 0.875rem;
    color: var(--sl-color-text);
    overflow-x: auto;
  }

  @media (max-width: 768px) {
    .api-header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .method-endpoint {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .endpoint {
      font-size: 0.875rem;
    }
  }
</style>

<script>
  // Add API testing functionality
  document.addEventListener('DOMContentLoaded', () => {
    const testForms = document.querySelectorAll('.test-form')

    testForms.forEach(form => {
      form.addEventListener('submit', async e => {
        e.preventDefault()

        const formData = new FormData(form)
        const endpoint = form.dataset.endpoint
        const method = form.dataset.method
        const resultsDiv = form.nextElementSibling
        const outputPre = resultsDiv.querySelector('.response-output')

        // Show results section
        resultsDiv.style.display = 'block'
        outputPre.textContent = 'Sending request...'

        try {
          const headers = {
            'Content-Type': 'application/json',
          }

          // Add auth header if API key provided
          const apiKey = formData.get('apiKey')
          if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
          }

          // Prepare request body
          let body = undefined
          const requestBody = formData.get('requestBody')
          if (requestBody && method !== 'GET') {
            body = requestBody
          }

          // Make the request
          const response = await fetch(endpoint, {
            method,
            headers,
            body,
          })

          const responseData = await response.json()

          // Display results
          outputPre.textContent = JSON.stringify(
            {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: responseData,
            },
            null,
            2
          )
        } catch (error) {
          outputPre.textContent = `Error: ${error.message}`
        }
      })
    })
  })
</script>
```

### Step 4: Enhanced Features

#### 4.1 Advanced Search Configuration

Extend Pagefind with comprehensive indexing:

```javascript
// Enhanced Starlight configuration for search
starlight({
  // ... existing config
  search: {
    provider: 'pagefind',
    pagefind: {
      // Include additional content directories
      indexDirs: ['src/content/docs', 'src/examples', 'public/demos'],

      // Exclude private or non-searchable content
      excludeSelectors: ['.no-search', '[data-private]', '.playground-editor', '.api-tester'],

      // Enhanced searchable attributes
      extraSearchableAttributes: ['data-component', 'data-category', 'data-status', 'data-version'],

      // Custom filters for better search experience
      filters: {
        category: {
          title: 'Category',
          options: [
            { label: 'Components', value: 'components' },
            { label: 'API', value: 'api' },
            { label: 'Guides', value: 'guides' },
            { label: 'Examples', value: 'examples' },
          ],
        },
        status: {
          title: 'Status',
          options: [
            { label: 'Stable', value: 'stable' },
            { label: 'Experimental', value: 'experimental' },
            { label: 'Beta', value: 'beta' },
          ],
        },
      },

      // Custom result formatting
      resultTransforms: {
        title: (title, meta) => {
          if (meta.category === 'components') {
            return `🧩 ${title}`
          }
          if (meta.category === 'api') {
            return `🔌 ${title}`
          }
          return title
        },
      },
    },
  },
})
```

#### 4.2 Documentation Analytics

Track usage patterns and popular content:

```astro
---
// src/components/starlight/DocsAnalytics.astro
---

<script>
  // Enhanced documentation analytics
  class DocsAnalytics {
    constructor() {
      this.sessionStart = Date.now()
      this.pageViews = []
      this.interactions = []

      this.init()
    }

    init() {
      // Track page views
      this.trackPageView()

      // Track component interactions
      this.trackComponentViews()

      // Track search usage
      this.trackSearchUsage()

      // Track playground usage
      this.trackPlaygroundUsage()

      // Track scroll depth
      this.trackScrollDepth()

      // Send analytics on page unload
      window.addEventListener('beforeunload', () => {
        this.sendAnalytics()
      })
    }

    trackPageView() {
      const pageData = {
        url: window.location.pathname,
        title: document.title,
        timestamp: Date.now(),
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      }

      this.pageViews.push(pageData)

      // Send to analytics service
      gtag('event', 'page_view', {
        page_title: pageData.title,
        page_location: pageData.url,
        content_group1: this.getContentCategory(),
      })
    }

    trackComponentViews() {
      // Track when component documentation is viewed
      const componentSections = document.querySelectorAll('[data-component]')

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const component = entry.target.dataset.component

              gtag('event', 'component_view', {
                component_name: component,
                page_path: window.location.pathname,
              })

              this.interactions.push({
                type: 'component_view',
                component,
                timestamp: Date.now(),
              })
            }
          })
        },
        { threshold: 0.5 }
      )

      componentSections.forEach(section => observer.observe(section))
    }

    trackSearchUsage() {
      // Track search interactions
      const searchInput = document.querySelector('[data-pagefind-ui] input')

      if (searchInput) {
        let searchTimeout

        searchInput.addEventListener('input', e => {
          clearTimeout(searchTimeout)

          searchTimeout = setTimeout(() => {
            const query = e.target.value.trim()

            if (query.length >= 3) {
              gtag('event', 'search', {
                search_term: query,
                page_path: window.location.pathname,
              })

              this.interactions.push({
                type: 'search',
                query,
                timestamp: Date.now(),
              })
            }
          }, 500)
        })
      }
    }

    trackPlaygroundUsage() {
      // Track component playground interactions
      const playgrounds = document.querySelectorAll('.component-playground')

      playgrounds.forEach(playground => {
        const component = playground.dataset.component

        // Track copy actions
        const copyBtn = playground.querySelector('[data-action="copy"]')
        copyBtn?.addEventListener('click', () => {
          gtag('event', 'playground_copy', {
            component_name: component,
            page_path: window.location.pathname,
          })
        })

        // Track code modifications
        const editor = playground.querySelector('.code-editor')
        if (editor) {
          let editTimeout

          editor.addEventListener('input', () => {
            clearTimeout(editTimeout)

            editTimeout = setTimeout(() => {
              gtag('event', 'playground_edit', {
                component_name: component,
                page_path: window.location.pathname,
              })
            }, 2000)
          })
        }
      })
    }

    trackScrollDepth() {
      let maxScroll = 0
      const throttledScroll = this.throttle(() => {
        const scrollPercentage = Math.round(
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        )

        if (scrollPercentage > maxScroll) {
          maxScroll = scrollPercentage

          // Track significant scroll milestones
          if (maxScroll >= 25 && maxScroll < 50) {
            gtag('event', 'scroll_depth', {
              depth: '25%',
              page_path: window.location.pathname,
            })
          } else if (maxScroll >= 50 && maxScroll < 75) {
            gtag('event', 'scroll_depth', {
              depth: '50%',
              page_path: window.location.pathname,
            })
          } else if (maxScroll >= 75 && maxScroll < 90) {
            gtag('event', 'scroll_depth', {
              depth: '75%',
              page_path: window.location.pathname,
            })
          } else if (maxScroll >= 90) {
            gtag('event', 'scroll_depth', {
              depth: '90%',
              page_path: window.location.pathname,
            })
          }
        }
      }, 250)

      window.addEventListener('scroll', throttledScroll)
    }

    getContentCategory() {
      const path = window.location.pathname

      if (path.includes('/components/')) return 'Components'
      if (path.includes('/api/')) return 'API'
      if (path.includes('/guides/')) return 'Guides'
      if (path.includes('/getting-started/')) return 'Getting Started'
      if (path.includes('/examples/')) return 'Examples'

      return 'Documentation'
    }

    sendAnalytics() {
      const sessionData = {
        sessionDuration: Date.now() - this.sessionStart,
        pageViews: this.pageViews,
        interactions: this.interactions,
        maxScrollDepth: this.maxScrollDepth,
      }

      // Send to analytics endpoint
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', JSON.stringify(sessionData))
      }
    }

    throttle(func, delay) {
      let timeoutId
      let lastExecTime = 0

      return function (...args) {
        const currentTime = Date.now()

        if (currentTime - lastExecTime > delay) {
          func.apply(this, args)
          lastExecTime = currentTime
        } else {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(
            () => {
              func.apply(this, args)
              lastExecTime = Date.now()
            },
            delay - (currentTime - lastExecTime)
          )
        }
      }
    }
  }

  // Initialize analytics when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new DocsAnalytics()
    })
  } else {
    new DocsAnalytics()
  }
</script>
```

### Step 5: Developer Experience Enhancements

#### 5.1 Documentation Authoring Tools

Create VS Code extension for Starlight documentation:

```json
{
  "name": "astro-basics-docs",
  "displayName": "Astro Basics Documentation Tools",
  "description": "VS Code extension for authoring Starlight documentation",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Snippets", "Other"],
  "contributes": {
    "snippets": [
      {
        "language": "mdx",
        "path": "./snippets/starlight.json"
      }
    ],
    "commands": [
      {
        "command": "astro-basics.newComponentDoc",
        "title": "Create Component Documentation",
        "category": "Astro Basics"
      },
      {
        "command": "astro-basics.newApiDoc",
        "title": "Create API Documentation",
        "category": "Astro Basics"
      },
      {
        "command": "astro-basics.validateLinks",
        "title": "Validate Documentation Links",
        "category": "Astro Basics"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "when": "explorerResourceIsFolder && resourcePath =~ /src\\/content\\/docs/",
          "command": "astro-basics.newComponentDoc",
          "group": "astro-basics"
        }
      ]
    }
  }
}
```

Corresponding snippets file:

```json
{
  "Component Documentation": {
    "prefix": "sl-component",
    "body": [
      "---",
      "title: ${1:Component Name}",
      "description: ${2:Component description}",
      "status: ${3|stable,experimental,beta,deprecated|}",
      "version: \"${4:1.0.0}\"",
      "category: ${5|astro,react,layout,form,utility|}",
      "---",
      "",
      "import { Tabs, TabItem, Badge } from '@astrojs/starlight/components'",
      "import ComponentPlayground from '../../../components/starlight/ComponentPlayground.astro'",
      "import ComponentStatus from '../../../components/starlight/ComponentStatus.astro'",
      "",
      "# ${1:Component Name}",
      "",
      "<ComponentStatus status=\"${3}\" version=\"${4}\" />",
      "",
      "${6:Component overview and description}",
      "",
      "## Quick Start",
      "",
      "<ComponentPlayground ",
      "  component=\"${7:ComponentName}\"",
      "  code={\\`---",
      "import ${7:ComponentName} from '#components/${5}/${7:ComponentName}.astro'",
      "---",
      "",
      "<${7:ComponentName} ${8:prop=\"value\"} />\\`}",
      "/>",
      "",
      "## API Reference",
      "",
      "<Tabs>",
      "  <TabItem label=\"Props\">",
      "    | Prop | Type | Default | Required | Description |",
      "    |------|------|---------|----------|-------------|",
      "    | \\`${9:propName}\\` | \\`${10:string}\\` | \\`${11:undefined}\\` | ${12|✅,❌|} | ${13:Prop description} |",
      "  </TabItem>",
      "  ",
      "  <TabItem label=\"Examples\">",
      "    ${14:// Add usage examples here}",
      "  </TabItem>",
      "</Tabs>",
      "",
      "## Accessibility",
      "",
      "${15:Accessibility considerations and ARIA support}",
      "",
      "## Related",
      "",
      "- ${16:[Related component or guide]}"
    ],
    "description": "Create a new component documentation page"
  },

  "API Documentation": {
    "prefix": "sl-api",
    "body": [
      "---",
      "title: ${1:API Name}",
      "description: ${2:API description}",
      "---",
      "",
      "import { Tabs, TabItem } from '@astrojs/starlight/components'",
      "import ApiExample from '../../../components/starlight/ApiExample.astro'",
      "",
      "# ${1:API Name}",
      "",
      "${3:API overview and description}",
      "",
      "## ${4:Endpoint Name}",
      "",
      "<ApiExample",
      "  method=\"${5|GET,POST,PUT,DELETE,PATCH|}\"",
      "  endpoint=\"${6:/api/endpoint}\"",
      "  description=\"${7:Endpoint description}\"",
      "  auth=\"${8|required,optional,none|}\"",
      "  request={{",
      "    ${9:key: \"value\"}",
      "  }}",
      "  response={{",
      "    ${10:id: \"123\",}",
      "    ${11:success: true}",
      "  }}",
      "  parameters={[",
      "    {",
      "      name: \"${12:paramName}\",",
      "      type: \"${13:string}\",",
      "      required: ${14|true,false|},",
      "      description: \"${15:Parameter description}\"",
      "    }",
      "  ]}",
      "/>",
      "",
      "## Error Responses",
      "",
      "${16:Document possible error responses}",
      "",
      "## Rate Limiting",
      "",
      "${17:Rate limiting information}"
    ],
    "description": "Create a new API documentation page"
  },

  "Guide Documentation": {
    "prefix": "sl-guide",
    "body": [
      "---",
      "title: ${1:Guide Title}",
      "description: ${2:Guide description}",
      "---",
      "",
      "import { Tabs, TabItem, Code } from '@astrojs/starlight/components'",
      "",
      "# ${1:Guide Title}",
      "",
      "${3:Guide introduction and overview}",
      "",
      "## Prerequisites",
      "",
      "Before starting this guide, ensure you have:",
      "",
      "- ${4:Prerequisite 1}",
      "- ${5:Prerequisite 2}",
      "",
      "## Step 1: ${6:First Step}",
      "",
      "${7:Step description}",
      "",
      "<Code",
      "  code={\\`${8:// Code example}\\`}",
      "  lang=\"${9|astro,javascript,typescript,bash|}\"",
      "  title=\"${10:Code title}\"",
      "/>",
      "",
      "## Step 2: ${11:Second Step}",
      "",
      "${12:Step description}",
      "",
      "## Next Steps",
      "",
      "- ${13:[Link to related guide]}",
      "- ${14:[Link to API reference]}"
    ],
    "description": "Create a new guide documentation page"
  }
}
```

#### 5.2 Automated Documentation Generation

GitHub Actions workflow for automated updates:

```yaml
# .github/workflows/docs-automation.yml
name: Documentation Automation

on:
  push:
    paths:
      - 'src/components/**'
      - 'src/types/**'
      - 'src/utils/**'
  pull_request:
    paths:
      - 'src/content/docs/**'

jobs:
  extract-component-info:
    name: Extract Component Information
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.message, 'docs:') == false

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Extract TypeScript interfaces
        run: |
          npm run docs:extract-types
          npm run docs:extract-props

      - name: Generate component documentation
        run: npm run docs:generate-components

      - name: Update API documentation
        run: npm run docs:update-api

      - name: Validate documentation links
        run: npm run docs:validate-links

      - name: Check for changes
        id: changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "changes=true" >> $GITHUB_OUTPUT
          else
            echo "changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.changes.outputs.changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'docs: auto-update component documentation'
          title: 'Documentation: Auto-update component and API docs'
          body: |
            ## Automated Documentation Update

            This PR contains automatically generated documentation updates based on changes to:
            - Component TypeScript interfaces
            - API type definitions
            - Component props and methods

            ### Changes Made
            - 🔄 Updated component documentation
            - 🔄 Refreshed API reference
            - 🔍 Validated all internal links

            **Note**: This is an automated PR. Please review the changes before merging.
          branch: docs/auto-update
          delete-branch: true

  validate-docs:
    name: Validate Documentation
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint documentation
        run: npm run lint:docs

      - name: Check links
        run: npm run docs:validate-links

      - name: Build documentation
        run: npm run build:docs

      - name: Test component examples
        run: npm run test:docs-examples

      - name: Generate lighthouse report
        run: npm run lighthouse:docs

      - name: Comment PR with results
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')

            // Read validation results
            const lintResults = fs.readFileSync('./docs-lint-results.json', 'utf8')
            const linkResults = fs.readFileSync('./link-check-results.json', 'utf8')

            const comment = \\`
            ## Documentation Validation Results

            ### Linting
            \\`\\`\\`json
            \${lintResults}
            \\`\\`\\`

            ### Link Validation  
            \\`\\`\\`json
            \${linkResults}
            \\`\\`\\`

            *Automated validation completed at \${new Date().toISOString()}*
            \\`

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            })
```

### Step 6: System Integration

#### 6.1 Enhanced Comment System Integration

Extend the existing comment system for Starlight documentation:

```astro
---
// src/components/starlight/PageFrame.astro
import type { Props } from '@astrojs/starlight/props'
import Default from '@astrojs/starlight/components/PageFrame.astro'
import CommentsSection from '#components/astro/CommentsSection.astro'
import DocsAnalytics from './DocsAnalytics.astro'
import FeedbackWidget from './FeedbackWidget.astro'

const { hasSidebar, ...props } = Astro.props

// Check if comments are enabled for this page
const enableComments = props.entry.data.comments !== false
const enableFeedback = props.entry.data.feedback !== false

// Get page metadata for enhanced features
const pageCategory = props.entry.data.category || 'general'
const componentName = props.entry.data.component
const lastUpdated = props.entry.data.lastUpdated
---

<Default {hasSidebar} {...props}>
  <slot />

  <!-- Enhanced page footer with multiple features -->
  <div class="starlight-page-footer">
    <!-- Last updated information -->
    {
      lastUpdated && (
        <div class="last-updated">
          <span class="last-updated-label">Last updated:</span>
          <time datetime={lastUpdated.toISOString()}>
            {lastUpdated.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>
      )
    }

    <!-- Page feedback widget -->
    {
      enableFeedback && (
        <FeedbackWidget
          pageId={props.id}
          pageTitle={props.entry.data.title}
          category={pageCategory}
        />
      )
    }

    <!-- Component-specific features -->
    {
      componentName && (
        <div class="component-info" data-component={componentName}>
          <h4>Component Information</h4>
          <div class="component-details">
            <span class="component-name">{componentName}</span>
            {props.entry.data.version && (
              <span class="component-version">v{props.entry.data.version}</span>
            )}
            {props.entry.data.status && (
              <span class="component-status status-{props.entry.data.status}">
                {props.entry.data.status}
              </span>
            )}
          </div>
        </div>
      )
    }

    <!-- Comments section -->
    {
      enableComments && (
        <div class="starlight-comments">
          <CommentsSection
            contentType="doc"
            contentId={props.id}
            contentTitle={props.entry.data.title}
            allowThreading={true}
            moderationEnabled={true}
          />
        </div>
      )
    }
  </div>

  <!-- Analytics tracking -->
  <DocsAnalytics />
</Default>

<style>
  .starlight-page-footer {
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 1px solid var(--sl-color-border);
    space-y: 2rem;
  }

  .last-updated {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--sl-color-text);
    opacity: 0.8;
    margin-bottom: 1.5rem;
  }

  .last-updated-label {
    font-weight: 500;
  }

  .component-info {
    background: var(--sl-color-bg-sidebar);
    border: 1px solid var(--sl-color-border);
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .component-info h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: var(--sl-color-text);
  }

  .component-details {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .component-name {
    font-family: var(--sl-font-mono);
    font-weight: 600;
    color: var(--sl-color-text-accent);
  }

  .component-version {
    background: var(--sl-color-accent-low);
    color: var(--sl-color-accent);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .component-status {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-stable {
    background: var(--sl-color-green-low);
    color: var(--sl-color-green);
  }

  .status-experimental {
    background: var(--sl-color-orange-low);
    color: var(--sl-color-orange);
  }

  .status-deprecated {
    background: var(--sl-color-red-low);
    color: var(--sl-color-red);
  }

  .starlight-comments {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--sl-color-border);
  }

  @media (max-width: 768px) {
    .starlight-page-footer {
      margin-top: 2rem;
    }

    .component-details {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
```

#### 6.2 Page Feedback Widget

Create a feedback system for documentation quality:

```astro
---
// src/components/starlight/FeedbackWidget.astro
export interface Props {
  pageId: string
  pageTitle: string
  category: string
}

const { pageId, pageTitle, category } = Astro.props
---

<div class="feedback-widget" data-page-id={pageId}>
  <div class="feedback-header">
    <h4>Was this page helpful?</h4>
    <p>Help us improve our documentation</p>
  </div>

  <div class="feedback-actions">
    <div class="quick-feedback">
      <button class="feedback-btn helpful" data-feedback="helpful"> 👍 Yes, helpful </button>
      <button class="feedback-btn not-helpful" data-feedback="not-helpful">
        👎 Needs improvement
      </button>
    </div>

    <div class="detailed-feedback" style="display: none;">
      <form class="feedback-form">
        <div class="feedback-category">
          <label>What type of feedback?</label>
          <select name="feedbackType">
            <option value="accuracy">Accuracy issue</option>
            <option value="clarity">Unclear explanation</option>
            <option value="completeness">Missing information</option>
            <option value="example">Need better examples</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="feedback-message">
          <label for="feedback-text">Details (optional):</label>
          <textarea
            id="feedback-text"
            name="message"
            rows="4"
            placeholder="Help us understand how we can improve this page..."></textarea>
        </div>

        <div class="feedback-submit">
          <button type="submit" class="submit-btn">Send Feedback</button>
          <button type="button" class="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>

    <div class="feedback-success" style="display: none;">
      <div class="success-message">
        <span class="success-icon">✅</span>
        <span>Thank you for your feedback!</span>
      </div>
    </div>
  </div>
</div>

<style>
  .feedback-widget {
    background: var(--sl-color-bg-sidebar);
    border: 1px solid var(--sl-color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin: 2rem 0;
  }

  .feedback-header {
    margin-bottom: 1.5rem;
  }

  .feedback-header h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: var(--sl-color-text);
  }

  .feedback-header p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--sl-color-text);
    opacity: 0.8;
  }

  .quick-feedback {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .feedback-btn {
    padding: 0.75rem 1.5rem;
    border: 1px solid var(--sl-color-border);
    border-radius: 0.5rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .feedback-btn:hover {
    border-color: var(--sl-color-accent);
    background: var(--sl-color-accent-low);
  }

  .feedback-btn.helpful:hover {
    border-color: var(--sl-color-green);
    background: var(--sl-color-green-low);
  }

  .feedback-btn.not-helpful:hover {
    border-color: var(--sl-color-orange);
    background: var(--sl-color-orange-low);
  }

  .detailed-feedback {
    border-top: 1px solid var(--sl-color-border);
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }

  .feedback-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .feedback-category label,
  .feedback-message label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--sl-color-text);
    font-size: 0.875rem;
  }

  .feedback-category select,
  .feedback-message textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--sl-color-border);
    border-radius: 0.375rem;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font-size: 0.875rem;
  }

  .feedback-message textarea {
    resize: vertical;
    font-family: inherit;
  }

  .feedback-submit {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .submit-btn,
  .cancel-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .submit-btn {
    background: var(--sl-color-accent);
    color: white;
    border: none;
  }

  .submit-btn:hover {
    background: var(--sl-color-accent-high);
  }

  .cancel-btn {
    background: transparent;
    color: var(--sl-color-text);
    border: 1px solid var(--sl-color-border);
  }

  .cancel-btn:hover {
    background: var(--sl-color-bg-sidebar);
  }

  .feedback-success {
    text-align: center;
    padding: 1rem;
  }

  .success-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--sl-color-green);
    font-weight: 500;
  }

  .success-icon {
    font-size: 1.25rem;
  }

  @media (max-width: 768px) {
    .quick-feedback {
      flex-direction: column;
    }

    .feedback-submit {
      flex-direction: column;
    }
  }
</style>

<script>
  // Add feedback widget functionality
  document.addEventListener('DOMContentLoaded', () => {
    const feedbackWidgets = document.querySelectorAll('.feedback-widget')

    feedbackWidgets.forEach(widget => {
      const pageId = widget.dataset.pageId
      const quickFeedback = widget.querySelector('.quick-feedback')
      const detailedFeedback = widget.querySelector('.detailed-feedback')
      const feedbackForm = widget.querySelector('.feedback-form')
      const successMessage = widget.querySelector('.feedback-success')

      // Handle quick feedback buttons
      const feedbackBtns = widget.querySelectorAll('.feedback-btn')
      feedbackBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const feedback = btn.dataset.feedback

          if (feedback === 'helpful') {
            // Send positive feedback and show success
            sendFeedback(pageId, { type: 'helpful' })
            showSuccess()
          } else {
            // Show detailed feedback form for negative feedback
            showDetailedFeedback()
          }
        })
      })

      // Handle detailed feedback form
      feedbackForm?.addEventListener('submit', async e => {
        e.preventDefault()

        const formData = new FormData(feedbackForm)
        const feedbackData = {
          type: 'not-helpful',
          category: formData.get('feedbackType'),
          message: formData.get('message'),
          pageId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }

        try {
          await sendFeedback(pageId, feedbackData)
          showSuccess()
        } catch (error) {
          console.error('Failed to send feedback:', error)
          // Show error message to user
        }
      })

      // Handle cancel button
      const cancelBtn = widget.querySelector('.cancel-btn')
      cancelBtn?.addEventListener('click', () => {
        hideDetailedFeedback()
      })

      function showDetailedFeedback() {
        quickFeedback.style.display = 'none'
        detailedFeedback.style.display = 'block'
      }

      function hideDetailedFeedback() {
        quickFeedback.style.display = 'flex'
        detailedFeedback.style.display = 'none'
      }

      function showSuccess() {
        quickFeedback.style.display = 'none'
        detailedFeedback.style.display = 'none'
        successMessage.style.display = 'block'

        // Auto-hide after 3 seconds
        setTimeout(() => {
          widget.style.display = 'none'
        }, 3000)
      }

      async function sendFeedback(pageId, data) {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        })

        if (!response.ok) {
          throw new Error('Failed to send feedback')
        }

        // Track feedback in analytics
        gtag('event', 'documentation_feedback', {
          page_id: pageId,
          feedback_type: data.type,
          category: data.category || 'quick',
        })
      }
    })
  })
</script>
```

## Implementation Timeline (4 Weeks)

### Week 1: Content Migration & Foundation

**Day 1-2: Migration Scripts**

- [ ] Create automated migration scripts for existing documentation
- [ ] Set up content validation and link checking tools
- [ ] Migrate core getting-started and configuration docs

**Day 3-4: Component Documentation Templates**

- [ ] Build ComponentPlayground interactive widget
- [ ] Create ComponentStatus tracking system
- [ ] Set up standardized component documentation templates

**Day 5: Testing & Validation**

- [ ] Test migration scripts on sample content
- [ ] Validate component playground functionality
- [ ] Set up automated content validation pipeline

### Week 2: Interactive Features & API Documentation

**Day 1-2: Enhanced Component System**

- [ ] Implement live component examples with editable code
- [ ] Add component version tracking and status indicators
- [ ] Create component gallery and showcase pages

**Day 3-4: API Documentation Framework**

- [ ] Build ApiExample interactive testing component
- [ ] Set up TypeScript-driven API documentation generation
- [ ] Create comprehensive API reference pages

**Day 5: Search & Discovery**

- [ ] Enhance Pagefind configuration with custom filters
- [ ] Implement advanced search features and result formatting
- [ ] Add search analytics and usage tracking

### Week 3: Developer Experience & Automation

**Day 1-2: Authoring Tools**

- [ ] Create VS Code extension with documentation snippets
- [ ] Set up automated documentation generation from TypeScript
- [ ] Implement link validation and content quality checks

**Day 3-4: Analytics & Feedback**

- [ ] Implement comprehensive documentation analytics tracking
- [ ] Create page feedback system with detailed insights
- [ ] Set up usage metrics and performance monitoring

**Day 5: GitHub Integration**

- [ ] Configure automated documentation update workflows
- [ ] Set up PR validation for documentation changes
- [ ] Create documentation review and approval processes

### Week 4: System Integration & Testing

**Day 1-2: Comment System Integration**

- [ ] Extend existing comment system for Starlight pages
- [ ] Implement enhanced PageFrame with multiple features
- [ ] Add moderation and threading support for documentation

**Day 3-4: Authentication & Protected Docs**

- [ ] Create protected documentation sections with role-based access
- [ ] Implement authentication gates for sensitive content
- [ ] Set up admin and developer-only documentation areas

**Day 5: Final Testing & Deployment**

- [ ] Comprehensive testing of all features and integrations
- [ ] Performance optimization and lighthouse validation
- [ ] Documentation of Phase 2 features and deployment guide

## Success Criteria

### Technical Metrics

- **Coverage**: 100% of existing documentation migrated successfully
- **Performance**: Documentation pages load in <2 seconds
- **Search**: 95% search success rate with enhanced indexing
- **Accessibility**: WCAG 2.1 AA compliance across all pages

### User Experience Metrics

- **Engagement**: 40% increase in documentation page views
- **Session Duration**: 30% increase in average time on documentation
- **Component Adoption**: 30% reduction in component integration time
- **Feedback**: 90%+ positive feedback rating on new documentation

### Developer Experience Metrics

- **Documentation Velocity**: 50% reduction in time to document new components
- **Link Validation**: 99% internal link accuracy maintained automatically
- **Content Quality**: 95% reduction in documentation inconsistencies
- **Automation**: 80% of documentation updates handled automatically

## Risk Mitigation

### Technical Risks

| Risk                        | Impact | Mitigation                                                |
| --------------------------- | ------ | --------------------------------------------------------- |
| Migration script failures   | High   | Comprehensive testing on backup data, rollback procedures |
| Performance degradation     | Medium | Progressive enhancement, performance monitoring           |
| Search functionality issues | Medium | Fallback to basic search, incremental enhancement         |
| Integration conflicts       | High   | Staged deployment, feature flags, compatibility testing   |

### Content Risks

| Risk                    | Impact | Mitigation                                         |
| ----------------------- | ------ | -------------------------------------------------- |
| Information accuracy    | High   | Review process, community feedback, regular audits |
| Content duplication     | Medium | Automated detection, clear content ownership       |
| Outdated examples       | Medium | Automated testing, version tracking                |
| Inconsistent formatting | Low    | Style guides, automated linting, templates         |

## Future Enhancements (Post-Phase 2)

### Phase 3 Considerations

- **Internationalization**: Multi-language documentation support
- **Advanced Search**: AI-powered semantic search and suggestions
- **Interactive Tutorials**: Step-by-step guided learning experiences
- **Community Features**: User-contributed examples and improvements
- **Integration Ecosystem**: Third-party plugin documentation
- **Video Content**: Embedded video tutorials and walkthroughs

### Continuous Improvement

- **A/B Testing**: Test different documentation formats and layouts
- **User Research**: Regular feedback collection and usability studies
- **Performance Monitoring**: Continuous optimization of load times and UX
- **Content Analytics**: Data-driven decisions for content priorities
- **Automation Enhancement**: Further reduce manual documentation overhead

## Conclusion

Phase 2 of the Starlight integration transforms the astro-basics documentation from a basic information repository into a comprehensive, interactive, and developer-friendly knowledge hub. The implementation focuses on user experience, developer productivity, and maintainable automation while preserving all existing functionality and extending the capabilities established in Phase 1.

The enhanced documentation system will serve as both a reference for developers using astro-basics and a showcase of best practices for modern documentation architecture. Through careful implementation of interactive components, comprehensive API documentation, and thoughtful system integration, Phase 2 establishes a foundation for continued growth and improvement of the documentation ecosystem.
