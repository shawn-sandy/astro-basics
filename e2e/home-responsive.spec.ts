import { test, expect } from '@playwright/test'
import { BASE_URL, VIEWPORTS, waitForPageReady } from './test-utils'

test.describe('Home Page Responsive Design', () => {
  test('responsive layout integrity', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    const viewportSizes = [
      VIEWPORTS.mobile, // Mobile
      VIEWPORTS.tablet, // Tablet
      VIEWPORTS.desktop, // Desktop
    ]

    for (const viewport of viewportSizes) {
      await page.setViewportSize(viewport)

      // Give time for responsive layout to adjust
      await page.waitForTimeout(500)

      // Test that main structure remains intact
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })
})
