# Environment File Parsing - Developer Guide

This document describes the robust environment file parsing utility that handles edge cases around environment variables like `DATABASE_PROVIDER`.

## Overview

The `EnvParser` utility provides a robust solution for reading and writing environment files that handles:

- Whitespace variations around equals signs and values
- Inline comments with both `#` and `//` syntax
- Quoted and unquoted values
- Empty values with comments
- URLs and special characters in values
- Malformed entries (with configurable error handling)

## API Reference

### EnvParser Class

```typescript
import { EnvParser } from '#utils/env-parser'

const parser = new EnvParser('.env', {
  allowComments: true, // Handle inline comments
  preserveWhitespace: false, // Trim whitespace from values
  ignoreMalformed: true, // Skip malformed lines instead of throwing
})
```

### Core Methods

#### `parseFile(): ParseResult<readonly EnvEntry[]>`

Parses the entire environment file and returns all entries.

```typescript
const result = parser.parseFile()
if (result.ok) {
  console.log('Found entries:', result.value)
} else {
  console.error('Parse error:', result.error)
}
```

#### `findVariable(key: string): ParseResult<EnvEntry | null>`

Finds a specific environment variable.

```typescript
const result = parser.findVariable('DATABASE_PROVIDER')
if (result.ok && result.value) {
  console.log('Provider:', result.value.value)
  console.log('Comment:', result.value.comment)
}
```

#### `updateVariable(key: string, value: string, comment?: string): ParseResult<void>`

Updates or adds an environment variable with proper formatting.

```typescript
const result = parser.updateVariable('DATABASE_PROVIDER', 'turso', 'Switched to Turso database')
```

### Convenience Functions

#### `getDatabaseProvider(): ParseResult<string | null>`

Safely gets the DATABASE_PROVIDER value.

```typescript
import { getDatabaseProvider } from '#utils/env-parser'

const result = getDatabaseProvider()
if (result.ok) {
  const provider = result.value // 'turso' | 'supabase' | null
}
```

#### `updateDatabaseProvider(provider: string, comment?: string): ParseResult<void>`

Safely updates the DATABASE_PROVIDER value.

```typescript
import { updateDatabaseProvider } from '#utils/env-parser'

const result = updateDatabaseProvider('turso', 'Switched to Turso')
```

## Edge Cases Handled

### Whitespace Variations

The parser handles various whitespace patterns around equals signs and values:

```env
DATABASE_PROVIDER=turso
DATABASE_PROVIDER  =  turso
DATABASE_PROVIDER   =turso
DATABASE_PROVIDER=  turso
```

### Comment Styles

Both hash and double-slash comments are supported:

```env
DATABASE_PROVIDER=turso # Hash comment
DATABASE_PROVIDER=turso // Double slash comment
DATABASE_PROVIDER=turso    # Comment with extra whitespace
```

### URLs and Special Characters

The parser correctly handles URLs with double slashes and other special characters:

```env
DATABASE_PROVIDER=turso://user:pass@host:3306/db?ssl=true
WEBHOOK_URL="https://api.example.com/webhook?token=abc123"
REGEX_PATTERN="^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
```

### Empty Values

Empty values with and without comments are handled properly:

```env
DATABASE_PROVIDER=
DATABASE_PROVIDER= # Empty with comment
DATABASE_PROVIDER=""
```

### Quoted Values

Both single and double quotes are supported:

```env
DATABASE_PROVIDER="turso with spaces"
APP_NAME='My Astro App'
```

## Error Handling

The utility uses a Result type pattern to avoid throwing exceptions:

```typescript
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: Error }
```

This allows for safe error handling without try-catch blocks:

```typescript
const result = parser.findVariable('DATABASE_PROVIDER')
if (!result.ok) {
  console.error('Failed to parse:', result.error.message)
  return
}

// Safe to use result.value here
const provider = result.value
```

## Usage Examples

### Database Provider Switching

```typescript
import { getDatabaseProvider, updateDatabaseProvider } from '#utils/env-parser'

// Check current provider
const currentResult = getDatabaseProvider()
if (currentResult.ok) {
  console.log('Current provider:', currentResult.value)
}

// Switch to Turso
const updateResult = updateDatabaseProvider('turso', 'Switched to Turso for better performance')
if (updateResult.ok) {
  console.log('Successfully updated DATABASE_PROVIDER')
} else {
  console.error('Failed to update:', updateResult.error.message)
}
```

### Bulk Environment Updates

```typescript
import { EnvParser } from '#utils/env-parser'

const parser = new EnvParser('.env')

// Update multiple variables
const updates = [
  { key: 'DATABASE_PROVIDER', value: 'turso', comment: 'Primary database' },
  { key: 'TURSO_DATABASE_URL', value: 'libsql://example.turso.io', comment: 'Production URL' },
  { key: 'TURSO_AUTH_TOKEN', value: 'token123', comment: 'Auth token' },
]

for (const update of updates) {
  const result = parser.updateVariable(update.key, update.value, update.comment)
  if (!result.ok) {
    console.error(`Failed to update ${update.key}:`, result.error.message)
  }
}
```

## Testing

The utility includes comprehensive tests covering all edge cases:

```bash
npm test -- env-parser.test.ts
```

Test coverage includes:

- ✅ Basic environment variable parsing
- ✅ Whitespace variations around equals signs
- ✅ Inline comments with hash and double slash
- ✅ Quoted values with spaces
- ✅ Comment-only lines (skipped)
- ✅ Empty lines (skipped)
- ✅ Complex whitespace and comment combinations
- ✅ Malformed lines handling
- ✅ Edge cases with empty values
- ✅ Special characters and URLs in values
- ✅ Variable finding and updating
- ✅ File operations and error handling

## Best Practices

1. **Always check the Result**: Use the `ok` property to check for errors before accessing values.

2. **Use convenience functions**: For DATABASE_PROVIDER specifically, use `getDatabaseProvider()` and `updateDatabaseProvider()`.

3. **Handle file not found**: The parser will return an error if the .env file doesn't exist.

4. **Backup before bulk updates**: When making multiple updates, consider backing up the original file.

5. **Use appropriate options**: Configure the parser options based on your needs (comment handling, malformed line behavior).

## Migration from Simple String Manipulation

If you're currently using simple string manipulation or regex to handle environment files, migrate to this utility for better reliability:

```typescript
// ❌ Fragile approach
const content = fs.readFileSync('.env', 'utf-8')
const newContent = content.replace(/DATABASE_PROVIDER=.*/, 'DATABASE_PROVIDER=turso')
fs.writeFileSync('.env', newContent)

// ✅ Robust approach
import { updateDatabaseProvider } from '#utils/env-parser'

const result = updateDatabaseProvider('turso', 'Switched to Turso')
if (!result.ok) {
  console.error('Update failed:', result.error.message)
}
```

This ensures proper handling of comments, whitespace, and edge cases that simple string replacement might break.
