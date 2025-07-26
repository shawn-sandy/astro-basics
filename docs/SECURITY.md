# Security Documentation

## Image URL Validation

This project includes security utilities to prevent XSS attacks through malicious image URLs.

### Problem

User-provided image URLs can be used to execute malicious scripts if not properly validated. Examples of dangerous URLs include:

```javascript
// XSS via javascript: protocol
"javascript:alert('XSS Attack')"

// XSS via data: URLs
"data:text/html,<script>alert('XSS')</script>"

// Event handler injection
"https://example.com/image.jpg?onload=alert('XSS')"
```

### Solution

The `src/utils/security.ts` module provides validation functions:

#### `validateImageUrl(url)`

Validates and sanitizes image URLs, rejecting dangerous protocols and patterns.

```typescript
import { validateImageUrl } from '#/utils/security'

const result = validateImageUrl(userProvidedUrl)
if (result.ok) {
  // Safe to use result.value
  console.log('Safe URL:', result.value)
} else {
  // Handle the error
  console.error('Invalid URL:', result.error.message)
}
```

#### `sanitizeImageUrl(url, fallback?)`

Returns a sanitized URL or null if validation fails, with optional fallback.

```typescript
import { sanitizeImageUrl } from '#/utils/security'

// With fallback
const safeUrl = sanitizeImageUrl(userUrl, 'https://placeholder.com/default.jpg')

// Without fallback (returns null if invalid)
const safeUrl = sanitizeImageUrl(userUrl)
```

#### `validateTrustedImageUrl(url, trustedDomains?)`

Validates URLs against a list of trusted domains (e.g., Clerk's CDN).

```typescript
import { validateTrustedImageUrl } from '#/utils/security'

// Use default trusted domains (Clerk CDN)
const result = validateTrustedImageUrl(clerkImageUrl)

// Use custom trusted domains
const result = validateTrustedImageUrl(url, ['cdn.example.com', '*.assets.com'])
```

### Implementation

The following components have been updated to use URL validation:

1. **Card.astro** - Validates `cardImage` prop
2. **MarkdownPostLayout.astro** - Validates `frontmatter.image.url`
3. **CollectionTagList.astro** - Validates `post.data.image.url`

### Example Usage in Components

```astro
---
import { sanitizeImageUrl } from '#/utils/security'

const { userImageUrl } = Astro.props
const safeImageUrl = sanitizeImageUrl(userImageUrl, '/images/default-avatar.jpg')
---

{safeImageUrl && <img src={safeImageUrl} alt="User Avatar" />}
```

### Rejected URL Patterns

- `javascript:` protocol
- `data:` protocol
- `vbscript:` protocol
- `file:` protocol
- Event handlers (`onclick=`, `onload=`, etc.)
- Script tags (`<script>`)
- Any malformed URLs

### Allowed URL Patterns

- `http:` protocol
- `https:` protocol
- Valid URL structure
- Clean query parameters and fragments

### Testing

Comprehensive tests are available in `tests/security.test.ts` covering:

- Valid URL validation
- Malicious URL rejection
- Edge cases and error handling
- Trusted domain validation
- Fallback functionality
