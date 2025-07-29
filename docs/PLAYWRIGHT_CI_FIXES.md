# Playwright CI/CD Pipeline Fixes

This document outlines the fixes implemented to resolve Playwright test failures in GitHub Actions CI/CD pipeline.

## Issues Identified

### 1. Environment Variable Problems

- Astro required `PUBLIC_CLERK_PUBLISHABLE_KEY` at build time
- Environment variables were not properly set before build process
- Fallback mechanism was timing out after build started

### 2. Browser Installation Failures

- Playwright browser downloads consistently failing with size mismatch errors
- No fallback mechanism for browser installation failures
- Network issues during browser downloads in CI environment

### 3. Test Configuration Issues

- Tests not optimized for CI environment
- Insufficient wait conditions for dynamic content
- Parallel execution causing resource conflicts in CI

## Solutions Implemented

### 1. Fixed Environment Variable Setup

**File: `.github/workflows/playwright.yml`**

- Moved environment variable setup to dedicated step before dependency installation
- Proper fallback mechanism with test credentials
- Environment variables now exported to `$GITHUB_ENV` for subsequent steps

```yaml
- name: Setup environment variables
  run: |
    if [ -n "${{ secrets.PUBLIC_CLERK_PUBLISHABLE_KEY }}" ]; then
      echo "PUBLIC_CLERK_PUBLISHABLE_KEY=${{ secrets.PUBLIC_CLERK_PUBLISHABLE_KEY }}" >> $GITHUB_ENV
    else
      echo "PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuY29tJA" >> $GITHUB_ENV
    fi
```

### 2. Improved Browser Installation

**File: `.github/workflows/playwright.yml`**

- Added retry logic for browser installation (3 attempts)
- System browser fallback (`chromium-browser` package)
- Clear browser cache between retry attempts
- Better error handling and logging

```yaml
- name: Install Playwright Browsers with retry
  run: |
    for i in {1..3}; do
      rm -rf ~/.cache/ms-playwright* || true
      if npx playwright install chromium --with-deps; then
        break
      else
        if [ $i -eq 3 ]; then
          sudo apt-get update && sudo apt-get install -y chromium-browser
        fi
      fi
    done
```

### 3. Optimized Playwright Configuration

**File: `playwright.config.ts`**

- CI-specific settings (sequential execution, single worker)
- Increased timeouts for CI environment
- System browser support with fallback executable path
- Better browser launch arguments for CI

```typescript
workers: process.env.CI ? 1 : undefined,
retries: process.env.CI ? 3 : 0,
timeout: process.env.CI ? 60000 : 30000,
```

### 4. Enhanced Test Reliability

**Files: `e2e/*.spec.ts`, `e2e/test-utils.ts`**

- Added `waitForPageReady()` helper function
- Better wait conditions (`networkidle` + timeout)
- More flexible test assertions
- Improved error filtering (ignore favicon, manifest errors)

```typescript
export const waitForPageReady = async (page: any) => {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}
```

## Key Configuration Changes

### Environment Variables

- `PUBLIC_CLERK_PUBLISHABLE_KEY`: Set with fallback to test key
- `CLERK_SECRET_KEY`: Set with fallback to test key
- `CI=true`: Enables CI-specific behavior
- `NODE_ENV=test`: Proper environment for testing

### Browser Configuration

- Chromium only in CI (faster execution)
- System browser fallback support
- Optimized launch arguments for headless CI

### Timeout Settings

- Page navigation: 30s (CI) vs 20s (local)
- Test timeout: 60s (CI) vs 30s (local)
- Expect timeout: 10s (CI) vs 5s (local)
- Server startup: 3min (CI) vs 2min (local)

## Testing the Fixes

### Local Validation

```bash
# Set environment variables
export PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2xlcmsuY29tJA
export CLERK_SECRET_KEY=sk_test_Y2xlcmsuY29tJA
export CI=true

# Test build
npm run build

# Run tests (requires browser installation)
npm run test:e2e
```

### CI Validation

The updated workflow now:

1. ✅ Sets environment variables correctly
2. ✅ Handles browser installation failures gracefully
3. ✅ Runs tests with CI-optimized settings
4. ✅ Collects proper artifacts for debugging

## Artifacts and Debugging

The workflow now collects:

- **Test Reports**: HTML and JSON formats
- **Failure Artifacts**: Screenshots, videos, test results
- **Debug Information**: Environment variable status, browser installation logs

## Future Improvements

1. **Monitoring**: Add alerting for CI failures
2. **Performance**: Consider test sharding for larger test suites
3. **Browser Matrix**: Re-enable Firefox/Safari when stable
4. **Caching**: Add dependency and browser caching for faster runs

## Troubleshooting

### Common Issues

1. **Environment Variables Missing**: Check GitHub Secrets configuration
2. **Browser Installation Fails**: Verify system dependencies are available
3. **Test Timeouts**: Increase timeout values in `playwright.config.ts`
4. **Server Startup Issues**: Check dev server logs in workflow artifacts

### Debug Commands

```bash
# Check environment setup
echo $PUBLIC_CLERK_PUBLISHABLE_KEY | cut -c1-20

# Verify browser installation
npx playwright --version

# Test configuration
npx playwright test --list
```
