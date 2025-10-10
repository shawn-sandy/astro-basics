# Authentication Testing Plan for Playwright

## Overview

This document outlines a comprehensive testing strategy for the Clerk authentication implementation in the Astro Kit project. The plan covers all aspects of authentication from basic route protection to advanced security scenarios.

## Current Auth Implementation Analysis

### Architecture Components

- **Middleware**: `src/middleware.ts:4-14` protects `/dashboard(.*)` and `/forum(.*)` routes
- **Components**: Uses Clerk's `SignedIn`, `SignedOut`, `UserButton`, `SignInButton`
- **Protected Routes**: `/dashboard` exists with auth-aware content
- **Auth Flow**: Redirects to Clerk's sign-in when unauthenticated
- **Layout**: `src/layouts/Auth.astro` provides authentication-specific layout

### Environment Requirements

- `PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key for client-side auth
- `CLERK_SECRET_KEY`: Clerk secret key for server-side validation
- Test environment should use Clerk's test/development keys

## Testing Phases

### Phase 1: Setup & Configuration

#### 1.1 Environment Setup

- [ ] Configure test environment variables for Clerk (test keys)
- [ ] Set up authentication state management in Playwright
- [ ] Create test user accounts in Clerk test environment
- [ ] Configure Playwright storage state for persistent auth sessions

#### 1.2 Test Infrastructure

- [ ] Create auth helper functions in `e2e/test-utils.ts`
- [ ] Set up test data fixtures for different user types
- [ ] Configure test database state management

### Phase 2: Unauthenticated User Tests

#### 2.1 Public Route Access

- [ ] Test home page accessibility without auth
- [ ] Verify navigation links work for public routes (`/`, `/about`, `/contact`)
- [ ] Test content routes (`/posts/1`, `/content/1`) accessibility
- [ ] Verify public content displays correctly

#### 2.2 Protected Route Blocking

- [ ] Test `/dashboard` redirects to Clerk sign-in when unauthenticated
- [ ] Test `/forum` redirects to Clerk sign-in when unauthenticated (if implemented)
- [ ] Verify middleware protection works correctly
- [ ] Test direct URL access attempts to protected routes

### Phase 3: Authentication Flow Tests

#### 3.1 Sign-In Process

- [ ] Test Clerk embedded sign-in component rendering
- [ ] Test successful login with valid test credentials
- [ ] Test failed login with invalid credentials
- [ ] Test form validation and error messages
- [ ] Test "Remember me" functionality
- [ ] Test password reset flow

#### 3.2 Sign-Up Process

- [ ] Test new user registration flow
- [ ] Test email verification process (if enabled)
- [ ] Test password requirements validation
- [ ] Test duplicate email handling
- [ ] Test social login options (if configured)

### Phase 4: Authenticated User Tests

#### 4.1 Protected Route Access

- [ ] Test `/dashboard` loads correctly after authentication
- [ ] Verify dashboard content displays (stats cards, activity list, quick actions)
- [ ] Test dashboard responsive design across viewports (mobile, tablet, desktop)
- [ ] Verify dashboard action links work correctly

#### 4.2 Authentication State Persistence

- [ ] Test session persistence across page refreshes
- [ ] Test authentication state after browser restart
- [ ] Test session timeout handling
- [ ] Verify logout functionality clears session properly

### Phase 5: Component Integration Tests

#### 5.1 Auth Component Behavior

- [ ] Test `SignedIn` component shows content when authenticated
- [ ] Test `SignedOut` component shows content when not authenticated
- [ ] Test `UserButton` functionality and dropdown menu
- [ ] Test conditional navigation based on auth state
- [ ] Verify proper component isolation

#### 5.2 Layout Integration

- [ ] Test `Auth.astro` layout renders correctly
- [ ] Verify header hiding functionality works
- [ ] Test breadcrumb hiding in auth layouts
- [ ] Test page title/description handling

### Phase 6: Security & Edge Cases

#### 6.1 Security Tests

- [ ] Attempt direct URL access to protected routes
- [ ] Test token manipulation/tampering
- [ ] Verify no sensitive data leaks in unauthenticated state
- [ ] Test CSRF protection (if applicable)
- [ ] Test session hijacking prevention

#### 6.2 Error Handling

- [ ] Test network failures during auth
- [ ] Test Clerk service unavailability scenarios
- [ ] Test malformed auth tokens
- [ ] Test rate limiting (if implemented)
- [ ] Test graceful degradation

### Phase 7: Cross-Browser & Performance

#### 7.1 Browser Compatibility

- [ ] Test auth flows in Chrome, Firefox, Safari
- [ ] Test mobile auth experience (responsive design)
- [ ] Verify consistent behavior across browsers
- [ ] Test keyboard navigation accessibility

#### 7.2 Performance Testing

- [ ] Measure auth redirect times
- [ ] Test concurrent user scenarios
- [ ] Monitor memory usage during auth flows
- [ ] Test auth component loading performance

## Implementation Guidelines

### Test Structure

```
e2e/
├── auth/
│   ├── auth-flows.spec.ts          # Sign-in/sign-up flows
│   ├── protected-routes.spec.ts    # Route protection tests
│   ├── auth-components.spec.ts     # Component behavior tests
│   ├── auth-security.spec.ts       # Security edge cases
│   └── auth-performance.spec.ts    # Performance tests
└── utils/
    ├── auth-helpers.ts             # Authentication utilities
    └── test-data.ts                # Test user fixtures
```

### Helper Functions Example

```typescript
// e2e/utils/auth-helpers.ts
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/dashboard');
  // Wait for Clerk redirect
  await page.waitForURL(/clerk/);
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function createAuthenticatedState() {
  // Setup authenticated storage state
  return {
    cookies: [...],
    origins: [...]
  };
}
```

### Test Data Management

- Use Clerk's test environment for consistent test users
- Implement test user cleanup after test runs
- Use environment-specific configuration for different test environments

### Best Practices

- Use Playwright's `storageState` for persistent authentication
- Mock Clerk responses for faster test execution where appropriate
- Implement visual regression testing for auth UI components
- Use page object model for complex auth interactions
- Group related tests and use proper test isolation

## Test Execution

### Local Development

```bash
# Run all auth tests
npm run test:e2e -- --grep "auth"

# Run specific test file
npx playwright test e2e/auth/auth-flows.spec.ts

# Run with UI mode for debugging
npx playwright test --ui e2e/auth/
```

### CI/CD Integration

- Ensure test environment variables are configured
- Use headless mode for CI execution
- Generate test reports and artifacts
- Set up parallel test execution for faster feedback

## Maintenance

### Regular Updates

- [ ] Update test credentials periodically
- [ ] Review and update test scenarios when auth features change
- [ ] Monitor test performance and optimize slow tests
- [ ] Update browser compatibility matrix

### Documentation

- [ ] Keep test documentation updated with code changes
- [ ] Document new test scenarios for feature additions
- [ ] Maintain troubleshooting guide for common test issues

## Success Criteria

All tests should pass consistently across:

- All supported browsers (Chrome, Firefox, Safari)
- All viewport sizes (mobile, tablet, desktop)
- All authentication states (signed in, signed out, pending)
- All protected and public routes
- All error scenarios and edge cases

The authentication system should provide:

- Secure route protection
- Seamless user experience
- Proper error handling
- Cross-browser compatibility
- Accessibility compliance
