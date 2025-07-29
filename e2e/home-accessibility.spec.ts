import { test, expect } from '@playwright/test'
import { BASE_URL, waitForPageReady } from './test-utils'

test.describe('Home Page Accessibility', () => {
  test('is keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Test that focusable elements exist
    const focusableElements = page.locator(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    await expect(focusableElements.first()).toBeVisible()

    // Test tab navigation by focusing first element and checking it receives focus
    const firstFocusable = focusableElements.first()
    await firstFocusable.focus()
    await expect(firstFocusable).toBeFocused()
  })

  test('images have accessibility attributes', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    const images = page.locator('img')
    const imageCount = await images.count()

    if (imageCount > 0) {
      // Test that all images have alt attributes
      for (let i = 0; i < imageCount; i++) {
        await expect(images.nth(i)).toHaveAttribute('alt')
      }
    }
  })
})
