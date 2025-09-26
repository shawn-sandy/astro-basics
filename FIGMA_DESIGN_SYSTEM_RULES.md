# Figma Design System Integration Rules

> **Purpose**: Comprehensive guidelines for integrating Figma designs into the astro-basics-website codebase using Model Context Protocol (MCP)

`★ Insight ─────────────────────────────────────`
**Hybrid Architecture**: This project combines Astro's server-side rendering with React interactivity, SCSS styling, and component-driven architecture. Understanding this multi-layered approach is crucial for proper Figma-to-code translation.
`─────────────────────────────────────────────────`

## Design System Structure

### 1. Token Definitions

**Location**: `src/styles/_base.scss`
**Format**: CSS Custom Properties (CSS Variables)

```scss
:root {
  --img-radius: 1rem;
  --error-color: firebrick;
  --success-color: green;
  --max-content-width: 1280px;
}
```

**Token Categories**:

- **Spacing**: Use consistent spacing units (1rem, 2rem, 3rem)
- **Colors**: Semantic naming (--error-color, --success-color)
- **Layout**: Maximum content width constraints
- **Border Radius**: Consistent image and component rounding

**Integration Pattern**:
When importing Figma designs, extract design tokens in this order:

1. Colors → CSS custom properties
2. Spacing → rem-based values
3. Typography → font-size variables
4. Border radius → consistent radius values

### 2. Component Library Structure

**Architecture**: Dual-system (Astro + React + External Library)

```
src/components/
├── astro/           # Server-rendered components
├── react/           # Client-interactive components
├── dashboard/       # Protected route components
└── views/           # Page-level view components
```

**Component Export Pattern**: `src/components/index.ts`

```typescript
// Export pattern for new components
export { default as ComponentName } from './astro/ComponentName.astro'
```

**Integration Guidelines**:

1. **Astro Components** (`.astro` files):
   - Use for static, server-rendered content
   - Perfect for layout components, cards, headers
   - Support props via TypeScript interfaces

```astro
---
type Props = {
  cardTitle?: string
  cardImage?: string
  cardLink?: string
}
const { cardTitle, cardImage, cardLink } = Astro.props as Props
---
```

2. **React Components** (`.tsx` files):
   - Use for interactive elements
   - Forms, buttons with state, dynamic content
   - Located in `src/components/react/`

```tsx
export type Props = {
  title: string
  description: string | undefined
}

export function Component({ title }: Props) {
  // Interactive logic here
}
```

3. **External Library Integration**: `@fpkit/acss`
   - Pre-built components available
   - Import pattern: `import { Card } from '@fpkit/acss'`
   - Use when Figma designs match existing components

### 3. Frameworks & Libraries

**Primary Stack**:

- **Framework**: Astro v5.13.5 (Server-Side Rendering)
- **Interactive Components**: React 18.2.0
- **Styling**: SCSS with CSS Custom Properties
- **UI Library**: @fpkit/acss v0.5.9
- **Build System**: Vite (via Astro)
- **Authentication**: Clerk (@clerk/astro)

**Adapter Configuration**:

```javascript
// Supports multiple deployment targets
adapter: (() => {
  switch (process.env.ASTRO_ADAPTER) {
    case 'node':
      return node({ mode: 'standalone' })
    case 'vercel':
      return vercel()
    case 'netlify':
      return netlify()
    default:
      return netlify()
  }
})()
```

### 4. Asset Management

**Structure**:

```
public/
├── images/          # Static images (PNG, WebP, JPEG)
├── icons/           # App icons and PWA assets
└── favicon.svg      # Site favicon
```

**Asset Usage Patterns**:

1. **Direct Public Assets**:

```astro
<img src="/images/filename.webp" alt="Description" />
```

2. **Astro Image Optimization**:

```astro
---
import { Image } from 'astro:assets'
import heroImage from '/public/images/hero.webp'
---

<Image src={heroImage} alt="Hero" width={854} height={184} />
```

3. **Security**: All image URLs are sanitized

```typescript
import { sanitizeImageUrl } from '#/utils/security'
const safeImage = sanitizeImageUrl(imageUrl, fallbackUrl)
```

**Figma Asset Integration**:

- Export images to `/public/images/` directory
- Use descriptive filenames (kebab-case)
- Prefer WebP format for optimization
- Always include alt text for accessibility

### 5. Icon System

**Current Status**: No centralized icon system
**Existing Usage**: Limited icon usage found in:

- PWA icons (`/public/icons/`)
- Dashboard components (minimal usage)

**Recommended Integration**:
When importing Figma icons:

1. **SVG Icons**: Export as individual SVG files

```
public/icons/
├── user.svg
├── settings.svg
└── arrow-right.svg
```

2. **Icon Component Pattern** (Create as needed):

```astro
---
// src/components/astro/Icon.astro
type Props = {
  name: string
  size?: string
  color?: string
}
const { name, size = '24', color = 'currentColor' } = Astro.props
---

<svg width={size} height={size} fill={color}>
  <use href={`/icons/${name}.svg#icon`}></use>
</svg>
```

### 6. Styling Approach

**Architecture**: SCSS with Component-Based Organization

```
src/styles/
├── index.scss           # Main entry point
├── _base.scss          # Global styles & tokens
├── components/         # Component-specific styles
│   ├── _card.scss
│   ├── _form.scss
│   ├── _alert.scss
│   └── _utility.scss
└── starlight-custom.scss # Documentation styles
```

**Compilation**:

```bash
sass --watch src/styles/index.scss:src/styles/index.css --style=compressed
```

**Key Patterns**:

1. **CSS Custom Properties** for theming:

```scss
:root {
  --card-gap: 1rem;
  --max-content-width: 1280px;
}
```

2. **Responsive Design**:

```scss
body > section {
  margin: auto;
  width: min(100%, var(--max-content-width));
}
```

3. **Component Scoping**:

```scss
.card {
  &:has(a:first-of-type:empty) {
    border: lightgray solid thin;
    display: grid;
    // Component-specific styles
  }
}
```

**Figma Integration Guidelines**:

- Extract colors as CSS custom properties
- Use rem units for spacing consistency
- Create component-specific SCSS files in `src/styles/components/`
- Import new stylesheets in `src/styles/index.scss`

### 7. Project Structure & Patterns

**Import Aliases**: Uses `#*` for internal imports

```typescript
import Header from '#components/astro/Header.astro'
import { SITE_TITLE } from '#utils/site-config'
import type { APIRoute } from 'astro'
```

**Content Management**: Three collections with identical schema

```typescript
// posts, docs, content collections
type ContentEntry = {
  title: string
  pubDate: Date
  description: string
  author: string
  tags: string[]
  featured: boolean
  publish: boolean
}
```

**Authentication**: Clerk middleware protects routes

- Protected: `/dashboard/*`, `/forum/*`, `/organization/*`
- Public: `/`, `/posts`, `/docs`, `/content`

## Figma-to-Code Integration Workflow

### Step 1: Component Analysis

1. **Identify Component Type**:
   - Static content → Astro component (`src/components/astro/`)
   - Interactive features → React component (`src/components/react/`)
   - Dashboard features → Dashboard component (`src/components/dashboard/`)

### Step 2: Asset Extraction

1. **Export Images**: Use Figma MCP to export to `/public/images/`
2. **Extract Icons**: Save SVGs to `/public/icons/`
3. **Gather Design Tokens**: Colors, spacing, typography

### Step 3: Style Implementation

1. **Create Component SCSS**: `src/styles/components/_component-name.scss`
2. **Add Design Tokens**: Update `src/styles/_base.scss`
3. **Import Styles**: Add `@use` in `src/styles/index.scss`

### Step 4: Component Development

1. **Create Component File**:
   - Astro: `src/components/astro/ComponentName.astro`
   - React: `src/components/react/ComponentName.tsx`
2. **Add Type Safety**: Define Props interface
3. **Export Component**: Update `src/components/index.ts`

### Step 5: Integration & Testing

1. **Import in Pages**: Use `#components` alias
2. **Test Responsiveness**: Verify mobile/desktop layouts
3. **Validate Accessibility**: Check alt text, ARIA labels
4. **Run Quality Checks**:

   ```bash
   npm run lint:all      # ESLint, StyleLint, Prettier
   npm run type-check    # TypeScript validation
   npm test              # Unit tests
   ```

## Best Practices for Figma Integration

### Design Token Extraction

```scss
// Extract systematically from Figma
:root {
  // Colors
  --primary-color: #1e293b;
  --secondary-color: #64748b;
  --success-color: #22c55e;
  --error-color: #ef4444;

  // Spacing Scale
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;

  // Typography
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

### Component Security

Always sanitize external data:

```typescript
import { sanitizeImageUrl } from '#/utils/security'
const safeImage = cardImage ? sanitizeImageUrl(cardImage, fallbackUrl) : undefined
```

### Performance Optimization

1. **Use Astro for Static Content**: Faster SSR, better SEO
2. **React for Interactivity**: Only when needed
3. **Image Optimization**: WebP format, proper sizing
4. **SCSS Compression**: `--style=compressed` in build

### Accessibility Standards

- **Alt Text**: Always provide meaningful descriptions
- **Color Contrast**: Meet WCAG 2.1 AA standards
- **Keyboard Navigation**: Ensure all interactive elements are accessible
- **Semantic HTML**: Use proper heading hierarchy

This design system provides the foundation for seamless Figma-to-code integration while maintaining the project's architectural integrity and performance characteristics.
