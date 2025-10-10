# Linting Guide

This document provides comprehensive information about the linting configuration and processes implemented in this Astro project.

## Overview

Our linting setup includes multiple tools working together to ensure code quality, consistency, and best practices:

- **ESLint**: JavaScript/TypeScript code linting
- **StyleLint**: SCSS/CSS linting
- **Prettier**: Code formatting
- **TypeScript**: Type checking with strict mode
- **Husky + lint-staged**: Pre-commit automation

## Quick Start

### Available Commands

```bash
# Fix all linting issues automatically
npm run fix:all

# Check all linting without fixes
npm run lint:all

# Individual commands
npm run lint           # Fix ESLint issues
npm run lint:check     # Check ESLint without fixes
npm run lint:styles    # Check SCSS/CSS issues
npm run lint:styles:fix # Fix SCSS/CSS issues
npm run format         # Format with Prettier
npm run format:check   # Check Prettier formatting
npm run type-check     # TypeScript type checking
```

### Pre-commit Automation

Every commit automatically runs:

1. ESLint fixes on staged `.js`, `.jsx`, `.ts`, `.tsx`, `.astro` files
2. StyleLint fixes on staged `.css`, `.scss` files
3. Prettier formatting on staged files
4. Only allows commit if all checks pass

## ESLint Configuration

### File Structure

ESLint uses a flat configuration system (`eslint.config.js`) with different rules for different file types:

#### 1. Global Settings

- **Scope**: All files
- **Purpose**: Define global variables and basic environment
- **Globals**: `console`, `process`, `window`, `document`, DOM types

#### 2. TypeScript Files in `/src`

- **Files**: `src/**/*.ts`, `src/**/*.tsx`
- **Parser**: `@typescript-eslint/parser`
- **Project Reference**: Uses `./tsconfig.json`
- **Plugins**: TypeScript, React, React Hooks, JSX a11y, Import

#### 3. TypeScript Files Outside `/src`

- **Files**: Config files, tests (`**/*.ts`, `**/*.tsx`, `!src/**/*`)
- **Parser**: `@typescript-eslint/parser` (no project reference)
- **Purpose**: Lint config and test files without strict project constraints

#### 4. Astro Files

- **Files**: `**/*.astro`
- **Configuration**: Uses `eslint-plugin-astro` flat/recommended config
- **Parser**: Astro plugin parser with TypeScript support

#### 5. JavaScript Files

- **Files**: `**/*.js`, `**/*.mjs`
- **Rules**: Basic JavaScript best practices

### Key ESLint Rules

#### TypeScript Rules

```javascript
{
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-explicit-any': 'warn'
}
```

#### React Rules

```javascript
{
  'react/react-in-jsx-scope': 'off',      // Not needed with React 17+
  'react/prop-types': 'off'               // Using TypeScript for props
}
```

#### Import/Export Rules

```javascript
{
  'import/order': ['error', {
    'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    'newlines-between': 'always',
    'alphabetize': { 'order': 'asc', 'caseInsensitive': true }
  }]
}
```

#### General Best Practices

```javascript
{
  'no-console': 'warn',
  'no-debugger': 'error',
  'prefer-const': 'error',
  'no-var': 'error'
}
```

### Ignored Patterns

- `dist/**` - Build output
- `node_modules/**` - Dependencies
- `.astro/**` - Astro cache
- `playwright-report/**` - Test reports
- `test-results/**` - Test artifacts
- `*.d.ts` - Type declaration files

## StyleLint Configuration

### File: `.stylelintrc.json`

#### Base Configuration

- **Extends**: `stylelint-config-standard-scss`
- **Plugins**: `stylelint-order`
- **Target Files**: `src/**/*.{css,scss}`

#### Key Rules

##### Property Ordering

```json
{
  "order/properties-alphabetical-order": true
}
```

Forces alphabetical ordering of CSS properties for consistency.

##### SCSS Rules

```json
{
  "scss/at-rule-no-unknown": null,
  "scss/dollar-variable-pattern": null,
  "scss/percent-placeholder-pattern": null
}
```

##### Code Quality Rules

```json
{
  "declaration-no-important": true,
  "max-nesting-depth": 4,
  "selector-max-compound-selectors": 4,
  "shorthand-property-no-redundant-values": true
}
```

##### Color and Values

```json
{
  "color-function-notation": "legacy",
  "alpha-value-notation": "number",
  "number-max-precision": 4
}
```

#### Ignored Files

- `dist/**/*` - Build output
- `node_modules/**/*` - Dependencies
- `src/styles/index.css` - Compiled SASS output

## Prettier Configuration

### File: `.prettierrc`

#### Core Settings

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### File-specific Overrides

##### Astro Files

```json
{
  "files": "*.astro",
  "options": {
    "parser": "astro"
  }
}
```

##### JSON and Markdown

```json
{
  "files": ["*.json", "*.md"],
  "options": {
    "tabWidth": 2
  }
}
```

##### SCSS Files

```json
{
  "files": "*.scss",
  "options": {
    "singleQuote": false
  }
}
```

### Ignored Files (`.prettierignore`)

- Build outputs: `dist/`, `.astro/`
- Dependencies: `node_modules/`
- Test artifacts: `playwright-report/`, `test-results/`
- Minified files: `*.min.js`, `*.min.css`
- Lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

## TypeScript Configuration

### Enhanced Strict Mode

The `tsconfig.json` includes strict type checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

#### Key Benefits

- **Null Safety**: Prevents null/undefined errors
- **Type Safety**: Requires explicit types
- **Function Safety**: Strict parameter and return types
- **Array Safety**: Requires index checking
- **Property Safety**: Exact optional property matching

## Pre-commit Hooks

### Husky Configuration

- **Initialization**: `npm run prepare` sets up Husky
- **Hook File**: `.husky/pre-commit`
- **Command**: `npx lint-staged`

### Lint-staged Configuration

Located in `package.json`:

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,astro}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix", "prettier --write"],
    "*.{json,md,yaml,yml}": ["prettier --write"]
  }
}
```

#### Process Flow

1. **Stage files** with `git add`
2. **Pre-commit hook** runs automatically
3. **ESLint fixes** code issues
4. **StyleLint fixes** style issues
5. **Prettier formats** all files
6. **Re-stage** fixed files
7. **Commit proceeds** if no errors

## Workflow Integration

### Development Workflow

#### 1. During Development

```bash
# Check code quality
npm run lint:all

# Fix issues automatically
npm run fix:all
```

#### 2. Before Commit

Pre-commit hooks run automatically, but you can run manually:

```bash
npx lint-staged
```

#### 3. CI/CD Integration

Add to your CI/CD pipeline:

```bash
npm run lint:all    # Check all linting
npm run type-check  # TypeScript checking
```

### IDE Integration

#### VS Code

The project includes `.vscode/settings.json` with:

- ESLint auto-fix on save
- Prettier formatting on save
- StyleLint integration

#### Extensions Recommended

- ESLint
- Prettier
- Astro
- StyleLint

## Troubleshooting

### Common Issues

#### 1. ESLint Parser Errors

**Problem**: "Parsing error: typescript with invalid interface loaded as resolver"
**Solution**: Check that files are included in appropriate tsconfig.json

#### 2. Astro Parser Issues

**Problem**: "Couldn't resolve parser 'astro'"
**Solution**: Ensure `prettier-plugin-astro` is installed

#### 3. StyleLint Property Order

**Problem**: Properties not in alphabetical order
**Solution**: Run `npm run lint:styles:fix` to auto-fix

#### 4. Pre-commit Hook Failures

**Problem**: Commit blocked by linting errors
**Solution**:

1. Run `npm run fix:all`
2. Review remaining errors manually
3. Stage fixed files and commit again

### Performance Considerations

#### Large Codebases

- ESLint can be slow on large projects
- Consider using `--cache` flag for faster subsequent runs
- Use file-specific linting during development

#### CI/CD Optimization

- Cache `node_modules` and linting caches
- Run linting in parallel with other checks
- Consider splitting linting across multiple jobs

## Customization

### Adding New Rules

#### ESLint

Edit `eslint.config.js`:

```javascript
rules: {
  'your-new-rule': 'error'
}
```

#### StyleLint

Edit `.stylelintrc.json`:

```json
{
  "rules": {
    "your-new-rule": true
  }
}
```

#### Prettier

Edit `.prettierrc`:

```json
{
  "yourNewOption": true
}
```

### Project-specific Overrides

Create local override files:

- `.eslintrc.local.js`
- `.prettierrc.local`
- `.stylelintrc.local.json`

These files are gitignored and won't affect other developers.

## Best Practices

### 1. Consistent Configuration

- Keep all linting configs in sync across team
- Use shared configurations when possible
- Document any project-specific deviations

### 2. Gradual Adoption

- Enable strict rules gradually
- Use warnings before errors for new rules
- Allow time for team adaptation

### 3. Tool Integration

- Configure IDE integration for immediate feedback
- Use pre-commit hooks to catch issues early
- Include linting in CI/CD pipeline

### 4. Documentation

- Keep this guide updated
- Document any custom rules or exceptions
- Share knowledge with team members

## Maintenance

### Regular Updates

```bash
# Update all linting dependencies
npm run npm-update

# Test after updates
npm run lint:all
npm run fix:all
```

### Rule Review

- Quarterly review of linting rules
- Assess rule effectiveness
- Adjust based on team feedback
- Monitor for new best practices

### Performance Monitoring

- Track linting speed in CI/CD
- Monitor pre-commit hook performance
- Optimize configurations as needed

---

This linting setup provides a solid foundation for maintaining code quality in your Astro project. Regular maintenance and team adherence to these practices will ensure consistent, high-quality code across your codebase.
