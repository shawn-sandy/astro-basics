Build semantic CSS classes from utility class patterns and store them in `src/styles/components/`. This command analyzes component markup, consolidates utility classes into meaningful semantic classes, and provides comprehensive CSS class generation guidance.

## Usage

```bash
/css-class-builder [--class-name=ComponentName] [--file=path/to/component]
```

## Options

- `--class-name`: Custom name for the generated semantic class (optional, auto-generates if not provided)
- `--file`: Specific component file to analyze (optional, uses current context if not provided)

## Command Process

### 1. Component Analysis
- Scans component HTML/Astro files for utility class patterns
- Maps utility classes to design token values from `_design-tokens.scss`
- Identifies common patterns (layout, spacing, colors, typography)
- Groups related utilities for semantic consolidation

### 2. Semantic Class Generation
- Creates meaningful class names based on component purpose and context
- Generates consolidated CSS using design token variables
- Maintains full design system compatibility
- Preserves responsive behavior and interactions

### 3. File Management
- Creates new SCSS file in `src/styles/components/_[component-name].scss`
- Updates `src/styles/index.scss` to include new component styles
- Provides before/after code comparison
- Generates comprehensive documentation

## Example Transformation

**Before (Multiple Utilities):**
```html
<div class="flex items-center justify-between p-6 bg-neutral-50 border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
  <h3 class="text-lg font-semibold text-neutral-900">Card Title</h3>
  <button class="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600">Action</button>
</div>
```

**After (Semantic Class):**
```html
<div class="content-panel">
  <h3 class="content-panel__title">Card Title</h3>
  <button class="content-panel__action">Action</button>
</div>
```

**Generated SCSS:**
```scss
// src/styles/components/_content-panel.scss
.content-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background-color: var(--color-neutral-50);
  border: var(--border-width-1) solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-duration-200) var(--transition-timing-out);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  &__title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    color: var(--color-neutral-900);
    margin: 0;
  }

  &__action {
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-primary-500);
    color: var(--color-neutral-50);
    border: none;
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: background-color var(--transition-duration-200) var(--transition-timing-out);

    &:hover {
      background-color: var(--color-primary-600);
    }

    &:focus {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
    }
  }
}
```

## Intelligent Features

### Smart Naming Conventions
- **Context-aware naming**: Analyzes component purpose and content structure
- **BEM methodology**: Follows block__element--modifier conventions
- **Conflict detection**: Checks for existing class names and suggests alternatives
- **Pattern recognition**: Identifies common design patterns (cards, panels, forms)

### Design Token Integration
- **Full compatibility**: Maintains existing design system architecture
- **CSS custom properties**: Uses design tokens for consistent theming
- **Dark mode support**: Preserves responsive design token behavior
- **Future-proof**: Enables easy design system evolution

### Code Quality
- **Performance optimization**: Reduces HTML class verbosity and CSS specificity
- **Maintainability**: Creates single source of truth for component styles
- **Accessibility**: Preserves focus states, ARIA compatibility, and semantic structure
- **Documentation**: Generates usage examples and implementation guides

## Educational Insights

This command demonstrates key architectural concepts:

- **Component-driven CSS**: Moving from utility-first to semantic component architecture
- **Design System Integration**: Leveraging design tokens for scalable, consistent styling
- **CSS Architecture**: Understanding specificity, inheritance, and maintainability patterns
- **Performance Benefits**: Reducing CSS payload and improving render performance

## Integration with Existing Workflow

- **Works with current utility system**: Preserves existing utility classes alongside new semantic ones
- **Follows project conventions**: Uses established SCSS architecture and import patterns
- **Maintains compatibility**: Ensures seamless integration with existing components
- **Supports migration**: Enables gradual transition from utility-first to semantic approaches

## Output and Documentation

The command provides:
1. **Consolidated SCSS file** with semantic classes using design tokens
2. **Updated component markup** with new semantic class names
3. **Implementation guide** with usage examples and best practices
4. **Performance metrics** showing reduction in HTML size and CSS specificity
5. **Migration checklist** for adopting the new semantic classes

This tool bridges the gap between utility-first rapid prototyping and maintainable, semantic component architecture while preserving the benefits of both approaches.