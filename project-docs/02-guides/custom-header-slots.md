# Custom Header Slots Guide

Learn how to customize page headers using Astro's slot pattern for flexible layout composition.

## Overview

The Base layout supports flexible header customization through Astro's named slot feature. This allows you to:

- Use the default Header component with standard props
- Provide custom header components for specific pages
- Hide headers completely when needed
- Maintain full backward compatibility with existing pages

## Quick Start

### Using the Default Header

No changes needed - existing behavior is preserved:

```astro
---
import Base from '#layouts/Base.astro'
---

<Base pageTitle="My Page" pageDescription="Page description" pageImageUrl="/images/hero.jpg">
  <!-- Page content -->
</Base>
```

**Result:** Renders the default `Header` component with provided props.

### Hiding the Header

Use the `hideHeader` prop to completely remove the header:

```astro
<Base hideHeader={true}>
  <!-- Page content without header -->
</Base>
```

**Use cases:**

- Authentication pages (login, register)
- Landing pages with custom hero sections
- Print-friendly pages

### Using a Custom Header Component

Provide a custom component via the `header` slot:

```astro
---
import Base from '#layouts/Base.astro'
import Welcome from '#components/astro/Welcome.astro'
---

<Base pageTitle="Welcome">
  <Welcome slot="header" />

  <!-- Page content -->
</Base>
```

**Result:** Renders your custom `Welcome` component instead of the default header.

## How It Works

### Implementation Logic

The Base layout uses this conditional rendering pattern:

```astro
{
  !hideHeader && (
    <>
      {Astro.slots.has('header') ? (
        <slot name="header" />
      ) : (
        <Header
          headerTitle={pageTitle || ''}
          headerDescription={pageDescription || ''}
          headerImageUrl={pageImageUrl || ''}
          headerImageAlt={pageTitle || ''}
        />
      )}
    </>
  )
}
```

**Decision Flow:**

1. **Check `hideHeader` prop**
   - If `true` → Skip rendering entirely (no header, no slot)
   - If `false` or undefined → Continue to step 2

2. **Check for header slot**
   - If slot provided → Render custom slot content
   - If no slot → Render default `Header` component

### Priority Order

```
hideHeader={true}  →  No header rendered (highest priority)
      ↓
  header slot      →  Custom header rendered
      ↓
  Default          →  Standard Header component (fallback)
```

## Usage Examples

### Example 1: Custom Header with Props

Pass a component with its own props:

```astro
---
import Base from '#layouts/Base.astro'
import CustomHero from '#components/astro/CustomHero.astro'
---

<Base pageTitle="Product Page">
  <CustomHero
    slot="header"
    title="Featured Product"
    subtitle="Limited Time Offer"
    backgroundImage="/hero-bg.jpg"
    ctaText="Shop Now"
    ctaLink="/shop"
  />

  <section>
    <!-- Product content -->
  </section>
</Base>
```

### Example 2: Conditional Custom Header

Show different headers based on conditions:

```astro
---
import Base from '#layouts/Base.astro'
import Header from '#components/astro/Header.astro'
import PromoHeader from '#components/astro/PromoHeader.astro'

const showPromo = true // Could be from CMS or feature flag
---

<Base pageTitle="Home">
  {
    showPromo ? (
      <PromoHeader slot="header" discount={20} />
    ) : (
      <Header slot="header" headerTitle="Welcome" headerDescription="Discover our products" />
    )
  }

  <!-- Page content -->
</Base>
```

### Example 3: Multiple Layout Inheritance

Works through layout composition:

```astro
---
// src/layouts/Marketing.astro
import Base from './Base.astro'
import HeroHeader from '#components/astro/HeroHeader.astro'

const { pageTitle, heroImage } = Astro.props
---

<Base pageTitle={pageTitle}>
  <HeroHeader slot="header" backgroundImage={heroImage} />

  <main>
    <slot />
  </main>
</Base>
```

```astro
---
// src/pages/landing.astro
import Marketing from '#layouts/Marketing.astro'
---

<Marketing pageTitle="Landing Page" heroImage="/hero.jpg">
  <!-- Landing page content -->
</Marketing>
```

### Example 4: Client-Side Interactive Header

Use React components with proper hydration:

```astro
---
import Base from '#layouts/Base.astro'
import InteractiveHeader from '#components/react/InteractiveHeader.tsx'
---

<Base pageTitle="Interactive Demo">
  <InteractiveHeader
    slot="header"
    client:load
    menuItems={['Home', 'About', 'Contact']}
    theme="dark"
  />

  <!-- Page content -->
</Base>
```

## Available Header Components

### Built-in Components

#### Header.astro

Standard page header with title and description.

**Location:** `src/components/astro/Header.astro`

**Props:**

```typescript
type Props = {
  headerTitle?: string
  headerDescription?: string
  headerImageUrl?: string
  headerImageAlt?: string
}
```

**Use case:** Default header for content pages, documentation, blog posts.

#### Welcome.astro

Simple welcome banner with heading.

**Location:** `src/components/astro/Welcome.astro`

**Props:** None (displays static content)

**Use case:** Landing pages, welcome screens, simple hero sections.

### Creating Custom Header Components

Follow these guidelines when creating custom headers:

```astro
---
// src/components/astro/CustomHeader.astro
export type Props = {
  title: string
  subtitle?: string
  theme?: 'light' | 'dark'
}

const { title, subtitle, theme = 'light' } = Astro.props
---

<header class={`custom-header custom-header--${theme}`}>
  <div class="custom-header__container">
    <h1 class="custom-header__title">{title}</h1>
    {subtitle && <p class="custom-header__subtitle">{subtitle}</p>}
  </div>
</header>

<style>
  .custom-header {
    padding: 2rem 1rem;
    text-align: center;
  }

  .custom-header--dark {
    background: var(--color-surface-dark);
    color: var(--color-text-inverse);
  }

  .custom-header__title {
    font-size: 2.5rem;
    font-weight: bold;
    margin: 0;
  }

  .custom-header__subtitle {
    font-size: 1.25rem;
    margin-top: 0.5rem;
    opacity: 0.9;
  }
</style>
```

## Best Practices

### 1. Maintain Semantic Structure

Headers should contain semantic HTML:

```astro
<!-- ✅ Good: Semantic structure -->
<header>
  <h1>Page Title</h1>
  <nav>
    <!-- Navigation -->
  </nav>
</header>

<!-- ❌ Avoid: Non-semantic structure -->
<div>
  <div class="title">Page Title</div>
  <div class="menu">
    <!-- Navigation -->
  </div>
</div>
```

### 2. Accessibility Considerations

Ensure custom headers maintain accessibility:

```astro
<header role="banner" aria-label="Site header">
  <h1 id="page-title">Page Title</h1>
  <nav aria-label="Primary navigation">
    <!-- Navigation items -->
  </nav>
</header>
```

### 3. Performance Optimization

For client-side components, choose appropriate hydration:

```astro
<!-- Static content: No hydration needed -->
<Header slot="header" />

<!-- Interactive on load -->
<InteractiveHeader slot="header" client:load />

<!-- Interactive when visible -->
<InteractiveHeader slot="header" client:visible />

<!-- Interactive when idle -->
<InteractiveHeader slot="header" client:idle />
```

### 4. Consistency Across Layouts

When extending Base.astro, preserve slot support:

```astro
---
// Custom layout extending Base
import Base from './Base.astro'

const { pageTitle, hideHeader } = Astro.props
---

<Base pageTitle={pageTitle} hideHeader={hideHeader}>
  <!-- Allow pages to still provide header slot -->
  {Astro.slots.has('header') && <slot name="header" slot="header" />}

  <main>
    <slot />
  </main>
</Base>
```

## Backward Compatibility

### No Breaking Changes

All existing pages continue to work without modification:

```astro
<!-- ✅ Works: Existing pages with no changes -->
<Base pageTitle="Old Page">
  <p>Content</p>
</Base>

<!-- ✅ Works: Pages using hideHeader -->
<Base hideHeader={true}>
  <p>Content</p>
</Base>

<!-- ✅ Works: New feature, opt-in -->
<Base pageTitle="New Page">
  <CustomHeader slot="header" />
  <p>Content</p>
</Base>
```

### Migration Path

No migration needed! The feature is purely additive:

1. **Phase 1 (Immediate):** New pages can use custom headers via slots
2. **Phase 2 (Optional):** Gradually update existing pages if needed
3. **Phase 3 (Future):** Consider standardizing header patterns

## Layout Hierarchy

Understanding how layouts inherit from Base:

```
Base.astro (header slot support)
    ├── Layout.astro (main layout with sidebar)
    │   └── Used by: index.astro, blog.astro, etc.
    │
    └── Auth.astro (authentication layout)
        └── Used by: login.astro, dashboard pages, etc.
```

All layouts pass through the `hideHeader` prop and can forward header slots to Base.

## Troubleshooting

### Header Not Rendering

**Symptom:** Custom header slot doesn't appear.

**Solution:** Check that `hideHeader` is not set to `true`:

```astro
<!-- ❌ Slot won't render -->
<Base hideHeader={true}>
  <CustomHeader slot="header" />
</Base>

<!-- ✅ Slot will render -->
<Base hideHeader={false}>
  <CustomHeader slot="header" />
</Base>
```

### Props Not Passing to Custom Header

**Symptom:** Custom header component not receiving props.

**Solution:** Ensure props are passed explicitly:

```astro
<!-- ❌ Props not passed -->
<Base pageTitle="Title">
  <CustomHeader slot="header" />
</Base>

<!-- ✅ Props passed explicitly -->
<Base>
  <CustomHeader slot="header" title="Custom Title" subtitle="Custom Subtitle" />
</Base>
```

### Styling Conflicts

**Symptom:** Custom header styles conflict with default styles.

**Solution:** Use scoped styles or unique class names:

```astro
<header class="my-custom-header">
  <!-- Content -->
</header>

<style>
  /* Scoped to this component */
  .my-custom-header {
    /* Custom styles */
  }
</style>
```

## Related Documentation

- **[Base Layout Source](/src/layouts/Base.astro)** - Implementation reference
- **[Component Library](/guide/components/)** - Available header components
- **[Astro Slots Documentation](https://docs.astro.build/en/core-concepts/astro-components/#slots)** - Official Astro slots guide
- **[Layout Patterns](/guide/layouts/)** - Layout composition patterns

## Examples Repository

Find complete working examples in:

- **Basic Usage:** `src/pages/index.astro` - Default header
- **Custom Header:** Create new page following patterns above
- **Hidden Header:** `src/pages/login.astro` - Authentication page
- **Layout Extension:** `src/layouts/Auth.astro` - Layout composition

## Changelog

**Version 1.0.0** (2025-01-15)

- Initial implementation of slot-based header customization
- Maintains full backward compatibility with existing pages
- Supports custom header components via named slots
- Preserves `hideHeader` prop functionality
