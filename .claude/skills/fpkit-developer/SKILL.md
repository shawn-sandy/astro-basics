---
name: fpkit-developer
description: A Claude Code skill for building applications with @fpkit/acss components
version: 0.1.2
---

# FPKit Developer

A Claude Code skill for building applications with **@fpkit/acss** components.

---

## Purpose

This skill helps you:

- **Compose custom components** from fpkit primitives
- **Validate CSS variables** against fpkit conventions
- **Maintain accessibility** when building with fpkit
- **Follow best practices** for component composition

**This skill is for:** Developers using @fpkit/acss in their applications

**Not for:** Developing the @fpkit/acss library itself (use `fpkit-component-builder` for that)

---

## Workflow

When a user requests a new component or feature, follow this workflow:

### Step 1: Analyze the Request

Understand what the user needs:

- What is the component supposed to do?
- What user interactions are required?
- Are there similar fpkit components?

**Ask clarifying questions** if the requirements are unclear.

---

### Step 2: Check for Existing fpkit Components

Review the [@fpkit/acss component catalog](https://github.com/shawn-sandy/acss/tree/main/packages/fpkit/src/components) or [Storybook](https://fpkit.netlify.app):

**Available components:**

- **Buttons:** Button
- **Cards:** Card, CardHeader, CardTitle, CardContent, CardFooter
- **Forms:** Input, Field, FieldLabel, FieldInput
- **Layout:** Header, Main, Footer, Aside, Nav
- **Typography:** Heading, Text
- **Dialogs:** Dialog, Modal
- **Feedback:** Alert, Badge, Tag
- **Data:** Table, List
- **Interactive:** Details, Popover
- **Icons:** Icon library

**Decision tree:**

```
Does fpkit have the exact component?
  → YES: Use it directly, customize with CSS variables

Can it be built by composing 2+ fpkit components?
  → YES: Proceed to Step 3 (Composition)

Can an fpkit component be extended/wrapped?
  → YES: Proceed to Step 4 (Extension)

Is it completely custom?
  → Proceed to Step 5 (Custom Implementation)
```

---

### Step 3: Compose from fpkit Components

**Create a new component file** that imports and combines fpkit components:

```tsx
// components/StatusButton.tsx
import { Button, Badge } from '@fpkit/acss'

export interface StatusButtonProps extends React.ComponentProps<typeof Button> {
  status: 'active' | 'inactive' | 'pending'
}

export const StatusButton = ({ status, children, ...props }: StatusButtonProps) => {
  return (
    <Button {...props}>
      {children}
      <Badge variant={status}>{status}</Badge>
    </Button>
  )
}
```

**Guidelines:**

- Import fpkit components using named imports
- Extend fpkit component prop types with TypeScript
- Spread `...props` to preserve all fpkit functionality
- Keep composition simple (≤ 3 levels deep)

**Reference:** See `references/composition.md` for patterns and examples

---

### Step 4: Extend fpkit Components

**Wrap an fpkit component** to add custom behavior:

```tsx
// components/LoadingButton.tsx
import { Button, type ButtonProps } from '@fpkit/acss'
import { useState } from 'react'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  onClickAsync?: (e: React.MouseEvent) => Promise<void>
}

export const LoadingButton = ({
  loading,
  onClickAsync,
  children,
  ...props
}: LoadingButtonProps) => {
  const [isLoading, setIsLoading] = useState(loading)

  const handleClick = async (e: React.MouseEvent) => {
    if (onClickAsync) {
      setIsLoading(true)
      try {
        await onClickAsync(e)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Button {...props} disabled={isLoading || props.disabled} onClick={handleClick}>
      {isLoading ? 'Loading...' : children}
    </Button>
  )
}
```

**Guidelines:**

- Extend fpkit prop types (don't replace them)
- Preserve all fpkit functionality
- Add custom logic around fpkit components
- Maintain accessibility (ARIA attributes, keyboard support)

---

### Step 5: Custom Implementation

If the component is truly custom and can't use fpkit:

1. **Follow fpkit patterns:**
   - Use semantic HTML
   - Add proper ARIA attributes
   - Support keyboard navigation
   - Use rem units (not px)
   - Define CSS variables for theming

2. **Create styles (if needed):**

   ```scss
   // components/CustomComponent.scss
   .custom-component {
     padding: var(--custom-padding, 1rem);
     border-radius: var(--custom-radius, 0.375rem);
     background: var(--custom-bg, white);

     // Use rem units only!
     margin-bottom: 1rem; // NOT 16px
     gap: 0.5rem; // NOT 8px
   }
   ```

3. **Validate CSS variables** (if you created custom styles):

   ```bash
   python scripts/validate_css_vars.py components/
   ```

**Reference:** See `references/css-variables.md` for naming conventions

---

### Step 6: Ensure Accessibility

**Check accessibility compliance:**

- [ ] Uses semantic HTML (`<button>`, `<nav>`, etc.)
- [ ] All interactive elements are keyboard accessible
- [ ] Proper ARIA attributes (`aria-label`, `aria-describedby`, etc.)
- [ ] Visible focus indicators
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Screen reader friendly (meaningful labels)

**Test:**

- Navigate with keyboard only (Tab, Enter, Escape)
- Use automated testing (jest-axe)
- Check Storybook a11y addon (if documenting in Storybook)

**Reference:** See `references/accessibility.md` for patterns

---

### Step 7: Document the Component (Optional)

If creating a reusable component for your team:

**Create a Storybook story:**

```tsx
// components/StatusButton.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { StatusButton } from './StatusButton'

const meta = {
  title: 'Components/StatusButton',
  component: StatusButton,
  tags: ['autodocs'],
} satisfies Meta<typeof StatusButton>

export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {
  args: {
    status: 'active',
    children: 'Server Status',
  },
}

export const Inactive: Story = {
  args: {
    status: 'inactive',
    children: 'Server Status',
  },
}
```

---

## Tools

### CSS Variable Validation

Validate custom CSS variables against fpkit conventions:

```bash
# Validate a file
python scripts/validate_css_vars.py components/Button.scss

# Validate a directory
python scripts/validate_css_vars.py styles/

# Validate current directory
python scripts/validate_css_vars.py
```

**What it checks:**

- ✅ Naming pattern: `--{component}-{property}`
- ✅ rem units (not px)
- ✅ Approved abbreviations: bg, fs, fw, radius, gap
- ✅ Full words for: padding, margin, color, border, display, width, height

---

## Reference Documentation

### Composition Patterns

See `references/composition.md` for:

- Decision tree (compose vs extend vs create)
- 5 common composition patterns
- Real-world examples (IconButton, ConfirmButton, TagInput)
- Anti-patterns to avoid
- TypeScript support

### CSS Variables

See `references/css-variables.md` for:

- Naming convention (`--component-property`)
- Discovery techniques (DevTools, autocomplete)
- Customization strategies (global, theme, component-specific)
- Variable reference for Button, Alert, Card
- Framework integration (React, CSS Modules, styled-components)

### Accessibility

See `references/accessibility.md` for:

- WCAG 2.1 Level AA compliance
- ARIA patterns and attributes
- Keyboard navigation
- Form accessibility
- Color contrast requirements
- Testing (manual + automated with jest-axe)

### Architecture

See `references/architecture.md` for:

- Polymorphic UI component foundation
- Understanding the `as` prop
- Simple vs compound component patterns
- TypeScript support and prop types
- Styling architecture (data attributes, CSS variables)
- Props patterns and conventions

### Testing

See `references/testing.md` for:

- Vitest and React Testing Library setup
- Testing composed components
- Query best practices (getByRole, getByLabelText)
- Event testing (clicks, keyboard, forms)
- Accessibility testing with jest-axe
- Async testing and loading states

### Storybook

See `references/storybook.md` for:

- Storybook setup and configuration
- Story structure and patterns
- Documenting composed components
- CSS variable customization stories
- Interactive testing with play functions
- Accessibility testing in Storybook

---

## Examples

### Example 1: Icon Button (Composition)

```tsx
import { Button } from '@fpkit/acss'

interface IconButtonProps extends React.ComponentProps<typeof Button> {
  icon: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const IconButton = ({
  icon,
  iconPosition = 'left',
  children,
  ...props
}: IconButtonProps) => {
  return (
    <Button {...props}>
      {iconPosition === 'left' && <span className="icon">{icon}</span>}
      {children}
      {iconPosition === 'right' && <span className="icon">{icon}</span>}
    </Button>
  )
}
```

---

### Example 2: Confirm Button (Enhanced Wrapper)

```tsx
import { Button, Dialog, type ButtonProps } from '@fpkit/acss'
import { useState } from 'react'

interface ConfirmButtonProps extends ButtonProps {
  confirmTitle?: string
  confirmMessage?: string
  onConfirm: () => void
}

export const ConfirmButton = ({
  confirmTitle = 'Confirm Action',
  confirmMessage = 'Are you sure?',
  onConfirm,
  children,
  ...props
}: ConfirmButtonProps) => {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleConfirm = () => {
    setShowConfirm(false)
    onConfirm()
  }

  return (
    <>
      <Button {...props} onClick={() => setShowConfirm(true)}>
        {children}
      </Button>

      <Dialog isOpen={showConfirm} onClose={() => setShowConfirm(false)}>
        <h2>{confirmTitle}</h2>
        <p>{confirmMessage}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </Dialog>
    </>
  )
}
```

---

### Example 3: Tag Input (Compound Composition)

```tsx
import { Tag } from '@fpkit/acss'
import { useState } from 'react'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export const TagInput = ({ value, onChange, placeholder }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('')

  const addTag = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()])
      setInputValue('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="tag-input">
      <div className="tag-list">
        {value.map(tag => (
          <Tag key={tag} onClose={() => removeTag(tag)}>
            {tag}
          </Tag>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
          }
        }}
        placeholder={placeholder || 'Add tag...'}
      />
    </div>
  )
}
```

---

## Best Practices

### ✅ Do

- **Compose from fpkit** - Start with fpkit components
- **Extend prop types** - Use TypeScript to extend fpkit types
- **Preserve accessibility** - Keep ARIA attributes and keyboard support
- **Use CSS variables** - Customize with variables, not hardcoded styles
- **Validate CSS** - Run validation script on custom styles
- **Document compositions** - Note which fpkit components you're using in JSDoc
- **Test integration** - Test how composed components work together

### ❌ Don't

- **Don't duplicate fpkit** - If it exists in fpkit, use it
- **Don't break accessibility** - Maintain ARIA and keyboard navigation
- **Don't use px units** - Always use rem
- **Don't over-compose** - Keep composition depth ≤ 3 levels
- **Don't nest interactive elements** - No `<button>` inside `<a>`
- **Don't ignore polymorphism** - Use `as` prop instead of wrapping

---

## Troubleshooting

### CSS Variables Not Applying

1. Check specificity - ensure your selector has equal or higher specificity
2. Check cascade order - import fpkit CSS before your overrides
3. Check typos - variable names are case-sensitive

### Component Not Keyboard Accessible

1. Ensure using semantic HTML (`<button>`, not `<div>`)
2. Add `role`, `tabIndex`, and keyboard handlers if needed
3. Check focus indicators are visible
4. Test with Tab, Enter, Space, Escape keys

### TypeScript Errors

1. Extend fpkit prop types: `interface MyProps extends ButtonProps`
2. Import types: `import { Button, type ButtonProps } from '@fpkit/acss'`
3. Spread props correctly: `<Button {...props}>`

---

## Resources

- **[fpkit Documentation](https://github.com/shawn-sandy/acss/tree/main/packages/fpkit/docs)** - Complete guides
- **[Storybook](https://fpkit.netlify.app/)** - Component examples
- **[npm Package](https://www.npmjs.com/package/@fpkit/acss)** - Installation and API
- **[GitHub](https://github.com/shawn-sandy/acss)** - Source code and issues

---

## Compatible with @fpkit/acss v1.x

This skill is designed for applications using `@fpkit/acss` version 1.x. For version-specific documentation, check the npm package documentation in `node_modules/@fpkit/acss/docs/`.
