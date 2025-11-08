# FPKit Developer

**Build applications with @fpkit/acss using Claude Code assistance**

A portable Claude Code skill for developers using the @fpkit/acss component library in their applications.

---

## What This Skill Does

This skill helps you:

✅ **Compose custom components** from fpkit primitives
✅ **Validate CSS variables** against fpkit conventions
✅ **Maintain accessibility** (WCAG 2.1 Level AA)
✅ **Follow best practices** for component composition
✅ **TypeScript support** for type-safe compositions

---

## Installation

### Option 1: Manual Installation (Recommended)

1. **Copy this skill directory** to your Claude Code skills folder:

```bash
# Copy to global skills (available in all projects)
cp -r /path/to/fpkit-developer ~/.claude/skills/

# Or copy to project-specific skills
cp -r /path/to/fpkit-developer ./.claude/skills/
```

2. **Verify installation**:

```bash
ls ~/.claude/skills/fpkit-developer/
# Should show: README.md  SKILL.md  references/  scripts/
```

3. **Restart Claude Code** to load the skill.

### Option 2: Clone from GitHub (Future)

When this skill is published to GitHub:

```bash
# Global installation
cd ~/.claude/skills/
git clone https://github.com/shawn-sandy/fpkit-consumer-skill.git fpkit-consumer

# Project-specific installation
cd ./.claude/skills/
git clone https://github.com/shawn-sandy/fpkit-consumer-skill.git fpkit-consumer
```

---

## Prerequisites

Your project must have **@fpkit/acss** installed:

```bash
npm install @fpkit/acss
# or
yarn add @fpkit/acss
# or
pnpm add @fpkit/acss
```

---

## Usage

### Activating the Skill

The skill activates automatically when you're working in a project using @fpkit/acss.

**Trigger phrases:**

- "Build a custom component using fpkit"
- "Create a [component name] with @fpkit/acss"
- "Compose a [feature] from fpkit components"
- "Help me use fpkit components"

### Example Interactions

#### Example 1: Composing a StatusButton

**You:**

> Create a StatusButton component that combines Button and Badge from fpkit

**Claude Code:**

> I'll help you create a StatusButton by composing fpkit components.
>
> ```tsx
> import { Button, Badge } from '@fpkit/acss'
>
> export interface StatusButtonProps extends React.ComponentProps<typeof Button> {
>   status: 'active' | 'inactive' | 'pending'
> }
>
> export const StatusButton = ({ status, children, ...props }: StatusButtonProps) => {
>   return (
>     <Button {...props}>
>       {children}
>       <Badge variant={status}>{status}</Badge>
>     </Button>
>   )
> }
> ```
>
> This composition:
>
> - ✅ Extends Button props with TypeScript
> - ✅ Preserves all fpkit Button functionality
> - ✅ Maintains accessibility (ARIA, keyboard support)
> - ✅ Keeps styling customizable via CSS variables

#### Example 2: Custom Styling

**You:**

> How do I customize the button padding in my StatusButton?

**Claude Code:**

> You can customize fpkit components using CSS variables:
>
> ```tsx
> <StatusButton
>   status="active"
>   style={{
>     '--btn-padding-inline': '2rem',
>     '--btn-padding-block': '1rem',
>   }}
> >
>   Server Status
> </StatusButton>
> ```
>
> Or create a CSS class:
>
> ```css
> .hero-status-button {
>   --btn-padding-inline: 2rem;
>   --btn-padding-block: 1rem;
>   --btn-fs: 1.25rem;
> }
> ```
>
> See `references/css-variables.md` for all available variables.

#### Example 3: Accessibility Check

**You:**

> Is this component accessible?

**Claude Code:**

> Let me check accessibility:
>
> ✅ Uses semantic Button element
> ✅ Inherits keyboard navigation
> ✅ Maintains focus indicators
> ⚠️ Add `aria-label` if using icon-only button
>
> Example with accessibility:
>
> ```tsx
> <StatusButton status="active" aria-label="Server status: active">
>   <ServerIcon aria-hidden="true" />
> </StatusButton>
> ```
>
> Run automated testing:
>
> ```tsx
> import { axe, toHaveNoViolations } from 'jest-axe'
>
> expect.extend(toHaveNoViolations)
>
> it('should not have accessibility violations', async () => {
>   const { container } = render(<StatusButton status="active">Server</StatusButton>)
>   const results = await axe(container)
>   expect(results).toHaveNoViolations()
> })
> ```

---

## Features

### 1. Component Composition Guidance

The skill uses a **decision tree** to determine the best approach:

```
Does fpkit have the component?
  → Use it directly

Can you compose 2+ fpkit components?
  → Composition (Pattern 1-5)

Can you extend an fpkit component?
  → Enhanced wrapper

Need something completely custom?
  → Custom implementation (with fpkit patterns)
```

### 2. CSS Variable Validation

Run the validation script on your custom styles:

```bash
# Validate a file
python ~/.claude/skills/fpkit-developer/scripts/validate_css_vars.py styles/button.scss

# Validate a directory
python ~/.claude/skills/fpkit-developer/scripts/validate_css_vars.py styles/

# From your project root
python ~/.claude/skills/fpkit-developer/scripts/validate_css_vars.py .
```

**What it checks:**

- ✅ Naming pattern: `--{component}-{property}`
- ✅ rem units (not px)
- ✅ Approved abbreviations: `bg`, `fs`, `fw`, `radius`, `gap`
- ✅ Full words for: `padding`, `margin`, `color`, `border`, `display`, `width`, `height`

### 3. Reference Documentation

Access comprehensive guides without leaving your terminal:

```bash
# View composition patterns
cat ~/.claude/skills/fpkit-developer/references/composition.md

# View CSS variable guide
cat ~/.claude/skills/fpkit-developer/references/css-variables.md

# View accessibility guide
cat ~/.claude/skills/fpkit-developer/references/accessibility.md

# View architecture guide
cat ~/.claude/skills/fpkit-developer/references/architecture.md

# View testing guide
cat ~/.claude/skills/fpkit-developer/references/testing.md

# View Storybook guide
cat ~/.claude/skills/fpkit-developer/references/storybook.md
```

Or ask Claude Code to reference them:

> "Show me composition patterns from the fpkit skill"

### 4. Documentation Sync

Keep documentation up-to-date with the latest fpkit guides:

```bash
# Sync all documentation from fpkit package
~/.claude/skills/fpkit-developer/scripts/sync-docs.sh

# Check which docs need updating
~/.claude/skills/fpkit-developer/scripts/sync-docs.sh --check

# Sync a specific guide
~/.claude/skills/fpkit-developer/scripts/sync-docs.sh --guide testing.md
```

**When to sync:**

- After updating @fpkit/acss to a new version
- When fpkit documentation is updated
- Periodically to ensure you have the latest patterns and examples

**Configuration:**
Edit `config.json` to customize documentation source:

- `docsSource`: "local" (default) or "online"
- `onlineDocsUrl`: GitHub raw URL for online fallback
- `fpkitDocsPath`: Relative path to fpkit docs in monorepo

---

## Skill Structure

```
fpkit-developer/
├── README.md                          # This file
├── SKILL.md                           # Claude Code skill workflow
├── config.json                        # Configuration (docs source, paths)
├── references/
│   ├── composition.md                 # Composition patterns and examples
│   ├── css-variables.md               # CSS variable naming and customization
│   ├── accessibility.md               # WCAG 2.1 AA compliance patterns
│   ├── architecture.md                # fpkit architecture and patterns
│   ├── testing.md                     # Testing strategies and examples
│   └── storybook.md                   # Storybook documentation patterns
└── scripts/
    ├── validate_css_vars.py           # Portable CSS validation script
    └── sync-docs.sh                   # Sync docs from fpkit package
```

---

## Compatibility

- **@fpkit/acss:** v1.x
- **Claude Code:** Latest version
- **Python:** 3.7+ (for validation script)
- **Node.js:** 18+ (for npm package)

---

## Available fpkit Components

The skill knows about these fpkit components:

**Layout:**

- Header, Main, Footer, Aside, Nav

**Content:**

- Heading, Text, Badge, Tag

**Forms:**

- Input, Field, FieldLabel, FieldInput, FieldTextarea

**Buttons & Actions:**

- Button

**Cards:**

- Card, CardHeader, CardTitle, CardContent, CardFooter

**Dialogs:**

- Dialog, Modal

**Feedback:**

- Alert

**Data Display:**

- Table, List

**Interactive:**

- Details, Popover

**Icons:**

- Icon library

---

## Common Workflows

### Workflow 1: Build a Custom Component

1. **Describe what you want:**

   > "Create a ConfirmButton that shows a confirmation dialog before executing an action"

2. **Claude Code identifies fpkit components:**
   - Button (for the trigger)
   - Dialog (for the confirmation modal)

3. **Composes solution:**

   ```tsx
   import { Button, Dialog } from '@fpkit/acss'
   import { useState } from 'react'

   export const ConfirmButton = ({ onConfirm, children, ...props }) => {
     const [showConfirm, setShowConfirm] = useState(false)
     // ... implementation
   }
   ```

4. **Validates accessibility:**
   - Keyboard navigation ✅
   - ARIA attributes ✅
   - Focus management ✅

5. **Provides usage example:**
   ```tsx
   <ConfirmButton variant="danger" onConfirm={handleDelete}>
     Delete Account
   </ConfirmButton>
   ```

### Workflow 2: Customize Styling

1. **Ask about customization:**

   > "How do I make the buttons larger and change the primary color?"

2. **Claude Code provides CSS variable solution:**

   ```css
   :root {
     --btn-padding-inline: 2rem;
     --btn-padding-block: 1rem;
     --btn-fs: 1.125rem;
     --btn-primary-bg: #0066cc;
   }
   ```

3. **Validates your custom CSS** (if needed):
   ```bash
   python scripts/validate_css_vars.py styles/
   ```

### Workflow 3: Ensure Accessibility

1. **Request accessibility review:**

   > "Check if my component is accessible"

2. **Claude Code reviews:**
   - Semantic HTML ✅
   - Keyboard navigation ✅
   - ARIA attributes ⚠️ (suggests improvements)
   - Color contrast ✅

3. **Suggests automated testing:**
   ```tsx
   import { axe, toHaveNoViolations } from 'jest-axe'
   // ... test code
   ```

---

## Best Practices Enforced

The skill helps you follow these best practices:

### ✅ Composition Over Duplication

- Reuse fpkit components instead of creating from scratch
- Compose 2-3 fpkit components to build complex UIs

### ✅ Type Safety

- Extend fpkit prop types with TypeScript
- Preserve all fpkit functionality with `...props` spreading

### ✅ Accessibility

- Maintain ARIA attributes from fpkit
- Support keyboard navigation
- Ensure color contrast meets WCAG AA

### ✅ Styling Conventions

- Use CSS variables for customization
- Use rem units (not px)
- Follow naming pattern: `--{component}-{property}`

### ✅ Testing

- Focus on testing your composition logic
- Trust fpkit's internal testing
- Use jest-axe for accessibility testing

---

## Troubleshooting

### Skill Not Activating

1. **Check installation path:**

   ```bash
   ls ~/.claude/skills/fpkit-developer/SKILL.md
   ```

2. **Restart Claude Code** after installation

3. **Verify @fpkit/acss is installed:**
   ```bash
   npm list @fpkit/acss
   ```

### Validation Script Not Working

1. **Check Python version:**

   ```bash
   python --version  # Should be 3.7+
   ```

2. **Make script executable:**

   ```bash
   chmod +x ~/.claude/skills/fpkit-developer/scripts/validate_css_vars.py
   ```

3. **Run with python3 explicitly:**
   ```bash
   python3 ~/.claude/skills/fpkit-developer/scripts/validate_css_vars.py styles/
   ```

### Documentation Not Found

Reference docs are copied to the skill directory:

```bash
# List references
ls ~/.claude/skills/fpkit-developer/references/

# View a guide
cat ~/.claude/skills/fpkit-developer/references/composition.md
```

---

## Contributing

This skill is part of the @fpkit/acss project. To suggest improvements:

1. **Report issues:** [GitHub Issues](https://github.com/shawn-sandy/acss/issues)
2. **Suggest features:** Open a discussion on GitHub
3. **Contribute code:** Submit a pull request

---

## Resources

### Official Documentation

- **[fpkit Docs](https://github.com/shawn-sandy/acss/tree/main/packages/fpkit/docs)** - Complete documentation
- **[Storybook](https://fpkit.netlify.app/)** - Interactive component examples
- **[npm Package](https://www.npmjs.com/package/@fpkit/acss)** - Installation and API reference

### Learning Resources

- **[WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)** - Accessibility standards
- **[React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)** - TypeScript patterns
- **[Testing Library](https://testing-library.com/)** - Testing best practices

---

## License

MIT License - Same as @fpkit/acss

---

## Version

**Skill Version:** 1.0.0
**Compatible with:** @fpkit/acss v1.x
**Last Updated:** 2025-01-06

---

**Happy building with @fpkit/acss and Claude Code!** 🚀
