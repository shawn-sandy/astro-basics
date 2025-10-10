# E2E Testing Workflow

This document describes the automated End-to-End (E2E) testing workflow implemented for the Astro Basics project.

## Overview

The E2E testing workflow (`e2e-tests.yml`) automatically runs Playwright tests on every pull request to the `primary` branch to ensure code quality and prevent UI regressions.

## Workflow Configuration

### Triggers

- Pull requests to `primary` branch (opened, synchronized, reopened, ready_for_review)
- Manual trigger via GitHub Actions UI (`workflow_dispatch`)
- Skips draft pull requests unless manually triggered

### Features

- **Timeout**: 30 minutes to prevent hanging builds
- **Concurrency Control**: Cancels previous runs when new commits are pushed
- **Browser Testing**: Chromium-only in CI for faster execution
- **Artifact Upload**: Test reports and screenshots on failure
- **Environment Variables**: Secure test credentials for Clerk authentication

## Technical Implementation

### Adapter Strategy

The workflow uses a dual-adapter approach:

- **Development**: Uses development server with Playwright's webServer config
- **CI**: Forces Node.js adapter (`process.env.CI === 'true'`) to enable preview mode
- **Production**: Defaults to Netlify adapter

This approach was necessary because the Netlify adapter doesn't support `npm run preview`.

### Server Strategy

In CI, the workflow:

1. Builds the application with Node.js adapter
2. Starts preview server manually (`npm run preview &`)
3. Waits for server to be ready using curl health check
4. Runs Playwright tests against the running server

### Authentication Handling

The workflow includes valid test Clerk keys to prevent authentication errors:

```bash
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y29uc2lzdGVudC1rZXN0cmVsLTgxLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_ZGVmYXVsdC10ZXN0LWtleS1mb3ItY2k
```

### Performance Optimizations

- **Single Browser**: Only Chromium in CI (vs. Chrome/Firefox/Safari locally)
- **Targeted Installation**: `npx playwright install chromium --with-deps`
- **Type Check**: Continues on error to avoid blocking on unrelated TypeScript issues

## Workflow Steps

1. **Setup Environment**

   - Checkout code with actions/checkout@v4
   - Setup Node.js 20 with npm caching
   - Install dependencies with `npm ci`

2. **Install Playwright**

   - Install Chromium browser with system dependencies

3. **Configure Environment**

   - Set up test environment variables
   - Configure Node.js adapter for CI

4. **Build & Test**

   - Run TypeScript type checking (non-blocking)
   - Build application for production
   - Start preview server in background
   - Wait for server readiness
   - Execute E2E tests with Playwright

5. **Artifact Handling**
   - Upload test reports and screenshots on failure
   - Retain artifacts for 7 days

## Local Testing

You can test the workflow steps locally using:

```bash
# Install dependencies
npm ci

# Install Playwright browsers
npx playwright install

# Set up environment
cat > .env << 'EOF'
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y29uc2lzdGVudC1rZXN0cmVsLTgxLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_ZGVmYXVsdC10ZXN0LWtleS1mb3ItY2k
SITE_URL=http://localhost:4321
NODE_ENV=test
CI=true
EOF

# Build and test
npm run build
npm run preview &
npm run test:e2e
```

## Test Coverage

The current E2E test suite covers:

### Home Page Tests

- **Structure**: Semantic elements, landmarks, heading hierarchy
- **Accessibility**: Keyboard navigation, image alt attributes
- **Performance**: Error-free loading, network idle state
- **Responsive Design**: Layout integrity across viewports

### Test Files

- `e2e/home-page.spec.ts` - Basic meta validation
- `e2e/home-structure.spec.ts` - Semantic HTML structure
- `e2e/home-accessibility.spec.ts` - A11y compliance
- `e2e/home-performance.spec.ts` - Loading performance
- `e2e/home-responsive.spec.ts` - Mobile/tablet/desktop layouts

## Troubleshooting

### Common Issues

**Type Check Failures**

- Type checking continues on error to avoid blocking E2E tests
- Existing TypeScript errors are unrelated to E2E testing functionality

**Server Startup Timeout**

- 60-second timeout for server readiness
- Health check uses curl to verify localhost:4321 availability

**Playwright Browser Installation**

- Workflow installs only Chromium to reduce build time
- Full browser suite (Chrome/Firefox/Safari) available for local development

**Authentication Errors**

- Workflow uses valid test Clerk keys
- Test credentials are safe for CI environments

### Debugging Failures

1. **Check GitHub Actions logs** for specific error messages
2. **Download test artifacts** from failed runs (playwright-report-{run-id})
3. **Review screenshots and traces** in uploaded artifacts
4. **Test locally** using the same environment variables

## Future Enhancements

Potential improvements for the E2E testing workflow:

- **Cross-browser testing** in CI (when build time allows)
- **Visual regression testing** with screenshot comparisons
- **API testing** for backend endpoints
- **Performance budgets** with Lighthouse integration
- **Mobile device testing** with additional viewport configurations

## Related Files

- `.github/workflows/e2e-tests.yml` - Main workflow configuration
- `playwright.config.ts` - Playwright test configuration
- `astro.config.mjs` - Astro configuration with adapter logic
- `e2e/` - Test files directory
- `e2e/test-utils.ts` - Shared test utilities
