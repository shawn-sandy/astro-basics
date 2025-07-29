import { test, expect } from '@playwright/test'
import { waitForPageReady } from './test-utils'

test('meta is correct', async ({ page }) => {
  await page.goto('/')
  await waitForPageReady(page)

  // Test that the page loads successfully
  await expect(page).toHaveTitle(/Astro/i)

  // Basic smoke test to ensure page content is loaded
  await expect(page.locator('main')).toBeVisible()
})
