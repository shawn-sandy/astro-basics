import { devices, type PlaywrightTestConfig } from '@playwright/test'

/**
 * Playwright configuration for Astro project
 * Optimized for both local development and CI environments
 * See https://playwright.dev/docs/test-configuration
 */
const config: PlaywrightTestConfig = {
  testDir: './e2e',

  // Test execution settings
  fullyParallel: process.env.CI ? false : true, // Sequential in CI for stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0, // More retries in CI for flaky tests
  workers: process.env.CI ? 1 : undefined, // Single worker in CI to avoid resource conflicts

  // Timeout settings - more generous for CI
  timeout: process.env.CI ? 60000 : 30000, // 60s in CI, 30s locally
  expect: {
    timeout: process.env.CI ? 10000 : 5000, // 10s in CI, 5s locally
  },

  // Output and reporting
  reporter: process.env.CI
    ? [['github'], ['html'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list'], ['html']],
  outputDir: 'test-results/',

  // Global test settings
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Additional CI optimizations
    actionTimeout: process.env.CI ? 15000 : 10000,
    navigationTimeout: process.env.CI ? 30000 : 20000,
  },

  // Browser configurations - only run Chromium in CI for speed
  projects: process.env.CI
    ? [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
            // CI-optimized launch options with system browser fallback
            launchOptions: {
              // Try to use system chromium if Playwright browser fails
              executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
              args: [
                '--disable-web-security',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-infobars',
                '--disable-notifications',
              ],
            },
          },
        },
      ]
    : [
        {
          name: 'chromium',
          use: {
            ...devices['Desktop Chrome'],
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    port: 4321,
    timeout: process.env.CI ? 180000 : 120000, // 3 minutes in CI, 2 minutes locally
    reuseExistingServer: !process.env.CI,
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: 'pipe',
    env: {
      // Ensure environment variables are available to the dev server
      PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Y2xlcmsuY29tJA',
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || 'sk_test_Y2xlcmsuY29tJA',
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  },
}

export default config
