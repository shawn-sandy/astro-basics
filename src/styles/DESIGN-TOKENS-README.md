# Design Tokens Documentation

Comprehensive design tokens extracted from Component Sample - Light theme, following W3C Design Token Community Group (DTCG) standards.

## 📁 Generated Files

### 1. **design-tokens.json** - W3C DTCG Format

W3C-compliant JSON format for cross-platform design systems.

**Use for:**

- Design tool integrations (Figma, Sketch)
- Platform-specific transformations
- Machine-readable token definitions

### 2. **design-tokens.css** - CSS Custom Properties

Modern CSS custom properties with cascade layers and accessibility features.

**Features:**

- Cascade layer organization (`@layer tokens`)
- Dark mode support (`prefers-color-scheme: dark`)
- Reduced motion support (`prefers-reduced-motion`)
- High contrast mode support (`forced-colors`)

**Import:**

```css
@import './design-tokens.css';
```

### 3. **\_component-sample-tokens.scss** - SCSS Variables

SCSS variables with utility mixins, compatible with project architecture.

**Features:**

- SCSS maps for dynamic access
- Helper functions (`get-color()`, `get-spacing()`)
- Component mixins (buttons, inputs, tags, alerts, modals)
- `!default` flags for customization

**Import:**

```scss
@import './component-sample-tokens';
```

### 4. **utilities.css** - Atomic Utility Classes

Tailwind-style utility classes with modern CSS features.

**Features:**

- Comprehensive utilities (colors, spacing, typography, layout)
- State variants (hover, focus, active)
- Container query variants (responsive)
- Dark mode variants
- Component utilities (button, input, tag, alert, modal)

**Import:**

```css
@import './utilities.css';
```

### 5. **design-tokens.ts** - TypeScript Definitions

Type-safe TypeScript definitions for design tokens.

**Features:**

- Full type definitions for all token categories
- Runtime constants for common values
- Helper functions for token access
- Type guards for validation

**Import:**

```typescript
import type { DesignTokens, ColorPalette } from '#types/design-tokens'
import { getColorShade, getSpacing, tokenToVarFunction } from '#types/design-tokens'
```

---

## 🎨 Token Categories

### Colors

**Primary Palette** - Neutral grays for text, backgrounds, and UI elements

- 10 shades: 50 (lightest) to 900 (darkest)
- Base: `--color-primary-500` (#6B7280)

**Accent Colors** - Brand and functional colors

- Red, Blue, Green, Yellow, Pink, Slate
- Each with 10 shades (50-900)
- Examples:
  - `--color-accent-red-600` (#DC2626)
  - `--color-accent-blue-500` (#3B82F6)
  - `--color-accent-green-600` (#16A34A)

**Semantic Colors** - Role-based color assignments

- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`
- Background: `--color-bg-primary`, `--color-bg-elevated`, `--color-bg-overlay`
- Border: `--color-border-default`, `--color-border-focus`, `--color-border-error`
- Alert: `--color-alert-background`, `--color-alert-border`, `--color-alert-text`
- Button: `--color-button-primary-bg`, `--color-button-danger-bg`

### Spacing

**Scale** - Mathematical progression (0.125rem to 4rem)

- `--spacing-scale-3xs`: 0.125rem (2px)
- `--spacing-scale-2xs`: 0.25rem (4px)
- `--spacing-scale-xs`: 0.5rem (8px)
- `--spacing-scale-sm`: 0.75rem (12px)
- `--spacing-scale-md`: 1rem (16px) - base
- `--spacing-scale-lg`: 1.5rem (24px)
- `--spacing-scale-xl`: 2rem (32px)
- `--spacing-scale-2xl`: 3rem (48px)
- `--spacing-scale-3xl`: 4rem (64px)

**Component Spacing** - Specific component paddings

- Input: `--spacing-input-padding-x`, `--spacing-input-padding-y`
- Button: `--spacing-button-padding-x`, `--spacing-button-padding-y`
- Modal: `--spacing-modal-padding`
- Tag: `--spacing-tag-padding-x`, `--spacing-tag-padding-y`, `--spacing-tag-gap`
- Form: `--spacing-form-field-gap`

### Typography

**Font Families**

- Sans: `--font-family-sans` (system font stack)
- Mono: `--font-family-mono`

**Font Sizes** - Scale from 12px to 30px

- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)

**Font Weights**

- regular: 400
- medium: 500
- semibold: 600
- bold: 700

**Line Heights**

- tight: 1.25 (headings)
- normal: 1.5 (body text)
- relaxed: 1.75

**Letter Spacing**

- tight: -0.025em
- normal: 0
- wide: 0.025em

### Border Radius

- none: 0
- sm: 0.25rem (4px)
- md: 0.375rem (6px) - buttons/inputs
- lg: 0.5rem (8px) - modals/cards
- xl: 1rem (16px) - tags
- full: 9999px - pill shape

### Shadows

- sm: Subtle shadow (1px)
- md: Medium shadow (4px)
- lg: Large shadow (10px)
- xl: Extra large shadow (20px) - modals

### Border Width

- none: 0
- thin: 1px (default)
- medium: 2px
- thick: 4px

### Opacity

- 0, 10, 25, 50, 75, 90, 100

### Transitions

**Duration**

- fast: 150ms
- normal: 250ms
- slow: 350ms

**Easing**

- linear, ease, ease-in, ease-out, ease-in-out

---

## 🧩 Usage Examples

### CSS Custom Properties

```css
.my-button {
  background-color: var(--color-primary-800);
  color: var(--color-text-inverse);
  padding: var(--spacing-button-padding-y) var(--spacing-button-padding-x);
  border-radius: var(--border-radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: background-color var(--transition-duration-fast);
}

.my-button:hover {
  background-color: var(--color-primary-700);
}
```

### SCSS Variables

```scss
@import './component-sample-tokens';

.custom-button {
  @include btn-primary;

  // Or manual composition
  background-color: $btn-primary-bg;
  color: $btn-primary-text;
  padding: $spacing-button-padding-y $spacing-button-padding-x;
}

.custom-tag {
  @include tag-red;
}

.custom-alert {
  @include alert-danger;
}

// Dynamic color access
$my-color: get-color('accent-red', 600); // Returns #DC2626
```

### Atomic Utility Classes

```html
<!-- Button with utilities -->
<button
  class="btn btn-primary px-md py-xs rounded-md font-medium text-sm hover:bg-primary-700 focus:outline-blue-500"
>
  Save Changes
</button>

<!-- Tag component -->
<span class="tag tag-red">
  Important
  <button>×</button>
</span>

<!-- Alert component -->
<div class="alert">
  <svg><!-- icon --></svg>
  <div>
    <p class="font-semibold">Components are low in stock</p>
    <p class="text-sm">Don't miss out on getting your hands on these popular items.</p>
  </div>
</div>

<!-- Modal with overlay -->
<div class="modal-overlay">
  <div class="modal">
    <h2 class="text-xl font-semibold mb-md">Would you like to upgrade?</h2>
    <p class="text-sm text-secondary mb-lg">We just released version 3.0...</p>
    <button class="btn btn-primary">Update to version 3.0</button>
  </div>
</div>

<!-- Form input -->
<input type="text" class="input w-full" placeholder="Enter your name" />

<!-- Card with spacing utilities -->
<article class="bg-white p-lg rounded-lg shadow-md border border-gray-200">
  <h2 class="text-2xl font-bold mb-md">Card Title</h2>
  <p class="text-base leading-relaxed text-secondary mb-lg">Card content...</p>
  <button class="btn btn-primary">Action</button>
</article>

<!-- Responsive grid -->
<div class="grid gap-md md:gap-lg md:grid-cols-2 lg:grid-cols-3">
  <div class="p-md bg-primary-50 rounded-md">Item 1</div>
  <div class="p-md bg-primary-50 rounded-md">Item 2</div>
  <div class="p-md bg-primary-50 rounded-md">Item 3</div>
</div>
```

### TypeScript

```typescript
import type { ColorPalette, SpacingScale } from '#types/design-tokens'
import {
  getColorShade,
  getSpacing,
  PRIMARY_COLORS,
  ACCENT_RED,
  tokenToVarFunction,
} from '#types/design-tokens'

// Type-safe color access
const primaryColor: string = getColorShade(PRIMARY_COLORS, 500)
const errorColor: string = getColorShade(ACCENT_RED, 600)

// Type-safe spacing
const mediumSpacing: string = getSpacing('md') // '1rem'

// Generate CSS var references
const cssVar = tokenToVarFunction('color.primary.500')
// Returns: 'var(--color-primary-500)'

// Component props with token types
interface ButtonProps {
  size?: SpacingScale
  variant?: 'primary' | 'danger'
}

function Button({ size = 'md', variant = 'primary' }: ButtonProps) {
  const padding = getSpacing(size)
  // Implementation...
}
```

---

## 🎯 Component Patterns from Sample

### Navigation Tabs

```html
<nav class="flex gap-md">
  <button class="text-sm font-medium" style="color: var(--color-accent-red-600)">Red</button>
  <button class="text-sm font-medium" style="color: var(--color-accent-blue-500)">Blue</button>
  <button class="text-sm font-medium" style="color: var(--color-accent-green-500)">Green</button>
</nav>
```

### Tag System

```html
<!-- Using utility classes -->
<div class="flex gap-xs">
  <span class="tag tag-gray">Tag X ×</span>
  <span class="tag tag-red">Tag Y ×</span>
  <span class="tag tag-green">Tag Z ×</span>
  <span class="tag tag-yellow">Tag W ×</span>
  <span class="tag tag-black">Tag ×</span>
</div>

<!-- Using SCSS mixin -->
<style lang="scss">
  .custom-tag {
    @include tag-red;
  }
</style>
```

### Alert/Notification

```html
<!-- Using utility class -->
<div class="alert">
  <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
    <circle cx="10" cy="10" r="8" />
  </svg>
  <div>
    <p class="font-semibold">Components are low in stock</p>
    <p class="text-sm">Hurry! Stock is running low...</p>
  </div>
</div>
```

### Form Input

```html
<div class="flex flex-col gap-sm">
  <label class="text-sm font-medium text-secondary">Full Name</label>
  <input type="text" class="input" placeholder="Value" />
</div>
```

### Button Variants

```html
<!-- Primary button -->
<button class="btn btn-primary">Save shipping information</button>

<!-- Danger button -->
<button class="btn btn-danger">Browse components</button>
```

### Modal Dialog

```html
<div class="modal-overlay">
  <div class="modal">
    <button class="absolute top-4 right-4" aria-label="Close">×</button>
    <h2 class="text-xl font-semibold mb-sm">Would you like to upgrade?</h2>
    <p class="text-sm text-secondary mb-lg">
      We just released version 3.0 of the Simple Design System...
    </p>
    <div class="flex gap-sm">
      <button class="btn btn-primary">Update to version 3.0</button>
      <button class="text-sm text-secondary">View planned updates</button>
    </div>
  </div>
</div>
```

---

## 🌗 Dark Mode Support

All tokens include automatic dark mode support via `prefers-color-scheme: dark`:

```css
/* Automatically inverts for dark mode */
.my-component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border-color: var(--color-border-default);
}
```

**Manual dark mode utilities:**

```html
<div class="bg-white dark:bg-primary-900 text-primary-900 dark:text-primary-50">
  Content that adapts to dark mode
</div>
```

---

## ♿ Accessibility Features

### WCAG Compliance

- All color combinations meet WCAG 2.2 AA contrast ratios
- Text colors: 4.5:1 minimum contrast
- Large text/UI components: 3:1 minimum contrast
- Focus indicators: 3:1 contrast against adjacent colors

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* All transitions and animations are disabled */
  * {
    transition-duration: 0ms !important;
    animation-duration: 0ms !important;
  }
}
```

### High Contrast Mode

```css
@media (forced-colors: active) {
  /* Shadows are removed, borders use system colors */
  :root {
    --color-border-focus: CanvasText;
    --shadow-sm: none;
  }
}
```

---

## 🚀 Modern CSS Features

### Cascade Layers

Tokens are organized using `@layer` for proper specificity:

```css
@layer reset, tokens, components, utilities;
```

This ensures:

1. Reset styles apply first
2. Token definitions come next
3. Component styles build on tokens
4. Utility classes always win

### Container Queries

Responsive utilities use container queries for intrinsic sizing:

```html
<div class="text-base md:text-lg lg:text-xl">Text that grows with container size</div>
```

### Logical Properties

Spacing utilities use logical properties for better i18n:

```css
.px-md {
  padding-inline: var(--spacing-scale-md);
} /* horizontal */
.py-sm {
  padding-block: var(--spacing-scale-sm);
} /* vertical */
```

---

## 📦 Integration

### In Astro Components

```astro
---
import '#styles/design-tokens.css'
import '#styles/utilities.css'
import type { ColorPalette } from '#types/design-tokens'
---

<div class="bg-white p-lg rounded-lg shadow-md">
  <h2 class="text-xl font-bold mb-md">Component Title</h2>
  <p class="text-sm text-secondary">Component content</p>
</div>
```

### In SCSS Files

```scss
@import './component-sample-tokens';

.my-component {
  @include btn-primary;

  &__tag {
    @include tag-red;
  }

  &__alert {
    @include alert-danger;
  }
}
```

### In React Components

```tsx
import '#styles/utilities.css'
import type { ButtonProps } from '#types/design-tokens'

export function Button({ children, variant = 'primary' }: ButtonProps) {
  return <button className={`btn btn-${variant}`}>{children}</button>
}
```

---

## 🔧 Customization

### SCSS Variables

All SCSS variables use `!default` flag for easy customization:

```scss
// Override before importing
$btn-primary-bg: #ff0000;
$spacing-scale-md: 20px;

@import './component-sample-tokens';
```

### CSS Custom Properties

Override CSS custom properties for theme variations:

```css
.theme-custom {
  --color-primary-500: #ff6b6b;
  --spacing-scale-md: 1.25rem;
  --border-radius-md: 0.5rem;
}
```

---

## 📊 Token Statistics

- **Total Color Tokens**: 70+ (including semantic colors)
- **Spacing Scale**: 9 levels
- **Typography Scale**: 7 font sizes, 4 weights, 3 line heights
- **Component Utilities**: 5+ ready-to-use components
- **Utility Classes**: 100+ atomic utilities
- **W3C DTCG Compliant**: ✅
- **Dark Mode Support**: ✅
- **Accessibility Features**: ✅
- **Modern CSS**: Cascade layers, container queries, logical properties

---

## 🎓 Best Practices

1. **Use Semantic Tokens** - Prefer `--color-text-primary` over `--color-primary-900`
2. **Consistent Spacing** - Use spacing scale tokens, not arbitrary values
3. **Component Composition** - Build components from utility classes
4. **Type Safety** - Use TypeScript types for design token access
5. **SCSS Mixins** - Leverage mixins for consistent component patterns
6. **Dark Mode First** - Test components in both light and dark modes
7. **Accessibility** - Always test with reduced motion and high contrast

---

## 📚 Resources

- [W3C Design Tokens Specification](https://tr.designtokens.org/format/)
- [CSS Cascade Layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

---

**Generated from Component Sample - Light theme**
**Version**: 1.0.0
**Date**: 2025-01-23
**Format**: W3C DTCG Compliant
