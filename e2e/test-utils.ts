// Use the same base URL as configured in playwright.config.ts
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321/'

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1200, height: 800 },
}

// Helper function to wait for the page to be ready
export const waitForPageReady = async (page: any) => {
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle')

  // Wait a bit more for any dynamic content
  await page.waitForTimeout(500)
}
