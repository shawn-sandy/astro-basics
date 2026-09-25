import { URL } from 'node:url'
import { devices, type PlaywrightTestConfig } from '@playwright/test'

/**
 * Playwright configuration for Astro project
 * See https://playwright.dev/docs/test-configuration
 * Playwright configuration for Astro project
 * See https://playwright.dev/docs/test-configuration
 */

/**
 * Server the suite runs against. Specs navigate with relative paths, so this is
 * the only place the target is set. Override it to test a dev server on another
 * port, such as a second worktree: `PLAYWRIGHT_BASE_URL=http://localhost:4330`.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321'

// The local dev server is started on the same port the suite targets, so an
// override cannot start one port and wait on another.
const port = new URL(baseURL).port || '4321'

const config: PlaywrightTestConfig = {
  testDir: './e2e',

  // Test execution settings

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Output and reporting
  reporter: [['html'], process.env.CI ? ['github'] : ['list']],
  outputDir: 'test-results/',

  // Global test settings
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Browser configurations
  projects: process.env.CI
    ? [
        // In CI, only test on Chromium for faster execution
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            // Optimize for faster execution
            launchOptions: {
              args: ['--disable-web-security', '--disable-dev-shm-usage'],
            },
          },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            // Optimize for faster execution
            launchOptions: {
              args: ['--disable-web-security', '--disable-dev-shm-usage'],
            },
          },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],

  // Development server configuration
  webServer: process.env.CI
    ? undefined // In CI, we'll start the preview server manually
    : {
        command: `npm run dev -- --port ${port}`,
        url: baseURL,
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
      },
}

export default config
