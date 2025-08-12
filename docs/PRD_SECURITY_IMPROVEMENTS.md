# Product Requirements Document: Security Improvements

**Document Version:** 2.0  
**Date:** 2025-08-12  
**Project:** astro-basics Message System Security Enhancement  
**Status:** Optimized - Essential Features Only

## Executive Summary

This PRD outlines the essential security improvements for the astro-basics message system. Focus is on addressing critical vulnerabilities with minimal complexity.

## Objectives

1. Eliminate critical XSS and injection vulnerabilities
2. Implement essential security measures (CSRF, rate limiting, input sanitization)
3. Establish basic security headers and error handling

## Scope

- Message submission API (`/src/pages/api/message-us.ts`)
- Message display components (`/src/components/dashboard/MessageList.astro`)
- Database operations (`/src/libs/turso.ts`)
- Form components and validation
- Middleware and security headers

## Essential Security Requirements

### 1. ~~Fix XSS Vulnerability in Message Display~~ ✅ SKIPPED

**Status:** Astro automatically escapes content by default, preventing XSS attacks without additional libraries.

**Reason for Skipping:**

- Astro's templating engine auto-escapes all dynamic content rendered with `{variable}` syntax
- No need for DOMPurify or manual HTML escaping
- XSS protection is built into the framework

**Verified:** Content in `/src/components/dashboard/MessageList.astro` is already safely rendered using Astro's default escaping.

### 2. Implement Rate Limiting

**User Story:** As a system owner, I need to prevent spam and DoS attacks on the message submission endpoint.

**Requirements:**

- Limit submissions to 5 per minute per IP address
- Return 429 status code when limit exceeded
- Implement exponential backoff for repeat offenders

**Acceptance Criteria:**

- [ ] Rate limiter configured on POST `/api/message-us`
- [ ] 429 response with retry-after header when limit exceeded
- [ ] Rate limit information stored in memory or Redis
- [ ] Clear error message displayed to users

**Quick Fix:** Add simple in-memory rate limiting to prevent spam. 5 requests per minute per IP.

---

## Completed Security Features

### CSRF Protection ✅

**User Story:** As a user, I need assurance that malicious sites cannot submit messages on my behalf.

**Requirements:**

- Generate unique CSRF tokens for each session
- Validate tokens on all POST requests
- Regenerate tokens after successful submission

**Acceptance Criteria:**

- [x] CSRF token generation implemented (`/src/utils/csrf.ts`)
- [x] Token validation in message submission handler (`/src/pages/api/message-us.ts`)
- [x] Token included in all forms as hidden field (`/src/pages/message-us.astro`)
- [x] 403 response for invalid/missing tokens

**Status:** ✅ Fully implemented with middleware integration and automatic token management.

### 3. Content Security Policy (CSP)

**User Story:** As a security engineer, I need CSP headers to prevent XSS and other injection attacks.

**Implementation Strategy:** Two-phase approach to enable strict CSP without breaking functionality.

#### Phase 1: Script Refactoring (Prerequisites)

**GitHub Issue:** [#222 - Refactor inline scripts to external files](https://github.com/shawn-sandy/astro-basics/issues/222)

**Requirements:**

- Extract all inline scripts from 15+ Astro components to external files
- Create `/public/scripts/` directory for client-side JavaScript
- Use Astro's ES modules pattern with `type="module"`
- Pass data via data attributes instead of inline variables
- Maintain progressive enhancement and SSR benefits

**Files to Refactor:**

- `/src/pages/message-us.astro` - Form submission handling
- `/src/pages/offline.astro` - Offline status handling
- `/src/components/astro/PWAInstallPrompt.astro` - PWA install prompts
- `/src/components/dashboard/*.astro` - Dashboard interactions
- Additional components with inline scripts

#### Phase 2: CSP Implementation

**Requirements:**

- Implement CSP headers in middleware.ts
- Start with report-only mode for testing
- Enforce strict policy after validation
- Monitor violations via report-uri

**Target CSP Policy (after refactoring):**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://*.clerk.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://images.clerk.dev data:;
  connect-src 'self' https://*.clerk.dev;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```

**Acceptance Criteria:**

- [ ] All inline scripts refactored to external files (Phase 1)
- [ ] CSP headers implemented in middleware (Phase 2)
- [ ] No 'unsafe-inline' for script-src directive
- [ ] Clerk authentication domains whitelisted
- [ ] CSP report-uri configured for monitoring
- [ ] All interactive features remain functional
- [ ] E2E and unit tests pass

**Timeline:**

- Phase 1 (Script Refactoring): 2-3 days
- Phase 2 (CSP Implementation): 1 day

### 4. Input Sanitization ✅ IMPLEMENTED

**User Story:** As a developer, I need all user inputs sanitized before storage to prevent injection attacks.

**Implementation:** Text-based sanitization optimized for Astro's auto-escaping environment.

**Requirements:**

- Remove dangerous characters and patterns from text input
- Normalize whitespace and validate data types
- Detect suspicious content patterns
- Maintain text-only format (no HTML preservation needed)

**Acceptance Criteria:**

- [x] Custom sanitization utilities implemented (`/src/utils/input-sanitization.ts`)
- [x] Text-based sanitization for name, email, subject, message fields
- [x] Suspicious content detection (script injection, SQL injection patterns)
- [x] Type validation and length enforcement
- [x] Integration with message-us API endpoint (`/src/pages/api/message-us.ts`)
- [x] Comprehensive unit tests for sanitization logic (`/tests/input-sanitization.test.ts`)
- [x] API integration tests (`/tests/api/message-us.test.ts`)

**Rationale:** DOMPurify not needed since:

- Astro auto-escapes all template content
- Messages are text-only (no HTML formatting required)
- Custom text sanitization is lighter and more appropriate

---

## Technical Architecture

### Security Stack

- **Rate Limiting:** In-memory store
- **CSRF Protection:** Double-submit cookie pattern (✅ Implemented)
- **Input Sanitization:** Server-side validation and escaping
- **CSP:** Strict policy after script refactoring (two-phase implementation)
  - Phase 1: Refactor inline scripts to external files
  - Phase 2: Implement strict CSP without 'unsafe-inline' for scripts

## Testing Requirements

### Essential Testing

1. **XSS Testing**

   - Test common XSS payloads
   - Verify HTML escaping works

2. **CSRF Testing**

   - Verify token validation
   - Test expired tokens

3. **Rate Limiting**
   - Test limit enforcement
   - Verify 429 responses

## Success Metrics

1. **Security Goals**

   - Zero XSS vulnerabilities in message display
   - Zero CSRF attacks possible
   - Effective rate limiting preventing spam

2. **Performance Goals**
   - API response time < 200ms
   - Minimal overhead from security measures

## Implementation Status

### ✅ Completed (2025-08-12)

**CSRF Protection**

- Token generation and validation (`/src/utils/csrf.ts`)
- Middleware integration (`/src/middleware.ts`)
- API endpoint validation (`/src/pages/api/message-us.ts`)
- Form integration (`/src/pages/message-us.astro`)

**XSS Protection**

- Astro's built-in auto-escaping verified (no additional libraries needed)

**Security Utilities**

- URL validation for XSS prevention (`/src/utils/security.ts`)
- Text-based input sanitization (`/src/utils/input-sanitization.ts`)

**Input Sanitization** ✅

- Custom sanitization utilities with comprehensive validation
- API integration with error handling for malicious content
- Comprehensive test coverage (unit and integration tests)

### ⏳ Pending

1. **Rate Limiting** - Spam protection for `/api/message-us`
2. **CSP Headers** - Two-phase implementation:
   - Phase 1: Script refactoring ([Issue #222](https://github.com/shawn-sandy/astro-basics/issues/222))
   - Phase 2: Strict CSP implementation

## Implementation Timeline

### Immediate (24-48 hours):

- Implement basic rate limiting

### Next Steps (3-5 days):

- Phase 1: Refactor inline scripts to external files (2-3 days)
- Phase 2: Implement strict CSP headers (1 day)

### Completed:

- ✅ CSRF protection (2025-08-12)
- ✅ XSS protection (Skipped - Astro handles automatically)
- ✅ Input sanitization (2025-08-12)

## Risk Assessment

### Implementation Risks

- **Performance Impact:** Sanitization may add minor latency
- **User Experience:** Rate limiting may affect legitimate high-volume users
- **Compatibility:** CSP headers need testing with existing assets

### Mitigation Strategies

- Test performance impact before deployment
- Set reasonable rate limits (5 requests/minute)
- Start with CSP in report-only mode

## Dependencies

### Required Libraries

- Simple rate limiting solution (in-memory)
- No additional libraries needed for CSP (middleware implementation)

### Already Implemented

- CSRF token management (custom implementation)
- Security utilities for URL validation

## Appendix

### Security Testing Checklist

- [x] XSS payloads tested (Astro auto-escaping verified)
- [x] CSRF protection validated (2025-08-12)
- [x] Input sanitization confirmed (2025-08-12)
- [ ] Rate limiting verified
- [ ] CSP headers validated

### Reference Documentation

- [OWASP XSS Prevention](https://owasp.org/www-community/attacks/xss/)
- [Security Audit Report](./audits/SECURITY_AUDIT_REPORT.md)

---

_Document optimized for essential security features only._
