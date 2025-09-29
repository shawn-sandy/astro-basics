## Usage Examples

**Auto-Detection Mode (Recommended):**

- `/ai-comments --auto-detect` - Analyze currently open file or selected code automatically
- `/ai-comments` - Smart analysis of current context (same as --auto-detect)

**Manual Invocation:**

- `/ai-comments src/middleware.ts` - Analyze specific file with intelligent filtering
- `/ai-comments src/libs/` - Analyze entire directory with complexity filtering
- `/ai-comments --force-all src/utils/` - Force analysis of all functions regardless of complexity

**Configuration:**

- `/ai-comments --complexity-threshold=5` - Lower threshold for more comments
- `/ai-comments --complexity-threshold=9` - Higher threshold for only most complex code

## Project-Specific Intelligence

**Astro-Basics Patterns Recognized:**

- Middleware authentication flows (`src/middleware.ts`)
- Database abstraction layer (`src/libs/database.ts`, `src/libs/turso.ts`, `src/libs/supabase.ts`)
- Security implementations (CSRF, rate limiting in `src/utils/`)
- Astro component server/client boundaries
- Content collection patterns and SSR considerations
- Clerk authentication integration points

## Complexity Scoring Algorithm

**High Priority (Score 8-10):**

- Security-sensitive functions (authentication, CSRF, validation)
- Database abstraction and provider switching logic
- Complex middleware with multiple responsibilities
- Error handling with business logic implications
- Performance-critical algorithms with optimizations

**Medium Priority (Score 5-7):**

- Business logic functions with non-obvious rules
- Integration points with external services
- Functions with multiple TypeScript diagnostics
- Complex type transformations or data processing

**Low Priority (Score 1-4):**

- Simple utility functions and helpers
- Obvious CRUD operations
- Standard React/Astro component patterns
- Well-typed functions with clear signatures

## Performance Optimizations

**Smart Caching System:**

- Cache complexity analysis results per file modification timestamp
- Store processed file signatures to avoid re-analysis of unchanged code
- Maintain session-based memory of recently analyzed functions

**Incremental Processing:**

- Process only modified sections when files change
- Skip unchanged functions that were previously analyzed
- Use AST diffing to identify specific code changes requiring re-analysis

**Fast Analysis Pipeline:**

1. **Quick Scan**: Rapid complexity scoring using regex patterns and AST basics
2. **Diagnostic Check**: Fetch TypeScript diagnostics only for flagged areas
3. **Deep Analysis**: Full business logic assessment only for high-complexity candidates
4. **Comment Generation**: Strategic JSDoc creation for approved functions

**Resource Management:**

- Limit concurrent file analysis to prevent IDE slowdown
- Use streaming analysis for large files (>1000 lines)
- Implement timeout controls for complex analysis operations

---

**Examples of Intelligent Analysis:**

✅ **Will Comment** (High Complexity Score: 9/10):

```typescript
// Complex middleware with auth, CSRF, rate limiting, and error handling
async function authMiddleware(auth, context, next) {
  // Multiple providers, security logic, business rules
}
```

✅ **Will Comment** (Medium Complexity Score: 6/10):

```typescript
// Database abstraction with provider switching logic
export async function executeQuery(query: string, provider?: DatabaseProvider) {
  // Provider detection, connection management, retry logic
}
```

❌ **Will Skip** (Low Complexity Score: 2/10):

```typescript
// Simple getter with obvious purpose and clear types
export const getSiteTitle = (): string => SITE_CONFIG.title
```

❌ **Will Skip** (Already Well-Documented):

```typescript
/**
 * CSRF protection utilities following OWASP guidelines
 * [Existing comprehensive JSDoc - will not add redundant comments]
 */
export async function generateCsrfToken(options?: CsrfOptions) {
  // Already has excellent documentation
}
```
