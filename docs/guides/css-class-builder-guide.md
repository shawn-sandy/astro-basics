# CSS Class Builder Guide: Utility Class Consolidation

Transform utility-first components into maintainable semantic CSS classes while preserving design system consistency.

## Overview

The CSS Class Builder system provides a powerful way to analyze components that use multiple utility classes and consolidate them into semantic CSS classes. This approach bridges the gap between rapid prototyping with utilities and maintainable production code.

## Quick Start

### Using the Slash Command

```bash
# Analyze current component and auto-generate class name
/css-class-builder

# Analyze specific component with custom class name
/css-class-builder --file=src/components/astro/Card.astro --class-name=content-card
```

### Using the Script Directly

```bash
# Dry run (preview only, no files written)
node scripts/css-class-builder.js --file=src/components/astro/MyComponent.astro --dry-run

# Generate semantic class with custom name
node scripts/css-class-builder.js --file=src/components/astro/MyComponent.astro --class-name=my-component
```

## How It Works

### 1. Component Analysis

The system scans your component markup and identifies utility classes that can be consolidated:

```astro
<!-- Before: Multiple utility classes -->
<div class="flex items-center justify-between p-6 bg-white rounded-lg shadow-md border border-gray-200">
  <h3 class="text-xl font-bold text-gray-900">Card Title</h3>
  <button class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
    Action
  </button>
</div>
```

### 2. Semantic Class Generation

Utilities are grouped by category and converted to semantic CSS using design tokens:

```scss
.content-card {
  // Layout Properties
  display: flex;
  align-items: center;
  justify-content: space-between;

  // Spacing Properties
  padding: var(--space-6);

  // Colors Properties
  background-color: var(--color-neutral-50);

  // Borders Properties
  border: var(--border-width-1) solid var(--color-neutral-200);
  border-radius: var(--radius-lg);

  // Effects Properties
  box-shadow: var(--shadow-md);

  &__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-neutral-900);
  }

  &__action {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary-500);
    color: var(--color-neutral-50);
    border-radius: var(--radius-base);
    
    &:hover {
      background-color: var(--color-primary-600);
    }
  }
}
```

### 3. Automatic File Management

The system automatically:
- Creates new SCSS file in `src/styles/components/`
- Updates `src/styles/index.scss` with the new import
- Provides before/after code comparison
- Generates implementation documentation

## Design Token Integration

### Consistent Mapping

All utility classes are mapped to design tokens for consistency:

| Utility Class | Design Token | CSS Output |
|---------------|--------------|------------|
| `p-6` | `--space-6` | `padding: var(--space-6)` |
| `bg-primary-500` | `--color-primary-500` | `background-color: var(--color-primary-500)` |
| `rounded-lg` | `--radius-lg` | `border-radius: var(--radius-lg)` |
| `shadow-md` | `--shadow-md` | `box-shadow: var(--shadow-md)` |

### Responsive Design Preservation

Design tokens maintain responsive behavior:

```scss
.component-class {
  // Tokens automatically adapt to screen size and theme
  padding: var(--space-4); // Responsive spacing
  color: var(--color-primary-500); // Theme-aware colors
  
  @media (min-width: 768px) {
    padding: var(--space-6);
  }
}
```

## Advanced Features

### Smart Naming Conventions

The system automatically generates meaningful class names based on content patterns:

- **Card patterns**: `flex`, `padding`, `shadow`, `border` → `content-card`
- **Button patterns**: `px-*`, `py-*`, `bg-primary-*`, `cursor-pointer` → `action-button`
- **Panel patterns**: `flex`, `items-center`, `justify-between` → `content-panel`

### BEM Methodology Support

Generated classes follow BEM conventions for scalability:

```scss
.feature-card {
  // Block styles

  &__header {
    // Element styles
  }

  &__title {
    // Element styles
  }

  &--featured {
    // Modifier styles
  }
}
```

### Conflict Detection

The system checks for existing class names and suggests alternatives:

```bash
⚠️  Class name 'card' already exists
✅  Suggested alternatives: 'content-card', 'feature-card', 'info-card'
```

## Best Practices

### When to Use CSS Class Builder

**✅ Good candidates for conversion:**

- Components with 5+ utility classes
- Repeated utility patterns across multiple components
- Components in production that need long-term maintenance
- Complex layouts with nested elements

**❌ Keep as utilities:**

- One-off styling adjustments
- Prototype components in active development
- Simple single-purpose utilities (e.g., `hidden`, `block`)
- Layout containers that vary significantly

### Migration Strategy

1. **Audit Phase**: Identify components with heavy utility usage
2. **Convert Phase**: Start with most-used/complex components
3. **Test Phase**: Ensure visual and functional parity
4. **Gradual Adoption**: Replace utilities incrementally

### Maintaining Consistency

- Use consistent naming patterns across your project
- Document component variants and modifiers
- Regular review of generated classes for optimization
- Keep utility system for rapid prototyping alongside semantic classes

## Educational Benefits

### CSS Architecture Understanding

- **Specificity Management**: Learn how semantic classes reduce specificity conflicts
- **Maintainability**: Understand single source of truth for component styles
- **Performance**: Discover how consolidated CSS improves render performance

### Design System Evolution

- **Token-First Thinking**: See how design tokens enable consistent theming
- **Component-Driven CSS**: Understand the progression from utilities to components
- **Scalable Architecture**: Learn patterns that grow with your application

### Development Workflow

- **Rapid Prototyping**: Use utilities for exploration, convert to semantic for production
- **Team Collaboration**: Share semantic classes across team members
- **Future-Proofing**: Create maintainable code that survives design system changes

## Troubleshooting

### Common Issues

**Generated CSS has duplicate properties**
- This is expected when utilities have overlapping styles
- The last declaration takes precedence (CSS cascade)
- Review generated CSS and remove duplicates manually if needed

**Class names conflict with existing styles**
- Use the `--class-name` option to specify a custom name
- Follow your project's naming conventions
- Check existing `src/styles/components/` directory

**Missing utility mappings**
- Not all utility classes are mapped to design tokens
- Add custom mappings to the `UTILITY_MAPPINGS` object in the script
- Submit issues for commonly needed utility mappings

### Getting Help

- Check existing component patterns in `src/styles/components/`
- Review design tokens in `src/styles/_design-tokens.scss`
- Test with `--dry-run` flag before generating files
- Use the `/css-class-builder` slash command for guided experience

## Examples

### Example 1: Card Component

**Input Component:**
```astro
<div class="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-xl font-semibold text-gray-900">Feature Title</h3>
    <span class="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">New</span>
  </div>
  <p class="text-gray-600 leading-relaxed">Description of the feature...</p>
</div>
```

**Command:**
```bash
/css-class-builder --file=src/components/astro/FeatureCard.astro --class-name=feature-card
```

**Generated SCSS:**
```scss
.feature-card {
  background-color: var(--color-neutral-50);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  border: var(--border-width-1) solid var(--color-neutral-100);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  &__title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-900);
  }

  &__badge {
    padding: var(--space-1) var(--space-3);
    background-color: var(--color-success-light);
    color: var(--color-success-dark);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-full);
  }

  &__description {
    color: var(--color-neutral-600);
    line-height: var(--line-height-relaxed);
  }
}
```

### Example 2: Button Component

**Input Component:**
```astro
<button class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
  <svg class="w-5 h-5 mr-2" fill="currentColor">...</svg>
  Get Started
</button>
```

**Command:**
```bash
/css-class-builder --class-name=primary-button
```

**Generated SCSS:**
```scss
.primary-button {
  display: inline-flex;
  align-items: center;
  padding: var(--space-3) var(--space-6);
  background-color: var(--color-primary-600);
  color: var(--color-neutral-50);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: background-color var(--transition-duration-200) var(--transition-timing-out);
  border: none;
  cursor: pointer;

  &:hover {
    background-color: var(--color-primary-700);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-primary-500), 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  &__icon {
    width: var(--space-5);
    height: var(--space-5);
    margin-right: var(--space-2);
  }
}
```

This system provides a powerful bridge between utility-first development and maintainable component architecture, enabling teams to move seamlessly between rapid prototyping and production-ready code.