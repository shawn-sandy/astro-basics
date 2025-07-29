import { test, expect } from '@playwright/test'
import { BASE_URL, waitForPageReady } from './test-utils'

test.describe('Home Page Performance', () => {
  test('loads without errors', async ({ page }) => {
    const errors: string[] = []
    const warnings: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') {
        // Filter out common non-critical errors
        if (
          !text.includes('favicon') &&
          !text.includes('manifest') &&
          !text.includes('sw.js') &&
          !text.includes('robots.txt')
        ) {
          errors.push(text)
        }
      } else if (msg.type() === 'warning') {
        warnings.push(text)
      }
    })

    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Allow some warnings but no critical errors
    expect(errors).toHaveLength(0)

    // Log warnings for debugging but don't fail the test
    if (warnings.length > 0) {
      console.log('Warnings detected:', warnings)
    }
  })

  test('page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now()

    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')

    const loadTime = Date.now() - startTime

    // Page should load within 10 seconds in CI
    expect(loadTime).toBeLessThan(10000)
  })
})
