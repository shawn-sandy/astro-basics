import { devices, type PlaywrightTestConfig } from '@playwright/test'

/**
 * Playwright configuration for Astro project
 * See https://playwright.dev/docs/test-configuration
 * Playwright configuration for Astro project
 * See https://playwright.dev/docs/test-configuration
 */
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
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Browser configurations
  projects: [
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    port: 4321,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
}

export default config
