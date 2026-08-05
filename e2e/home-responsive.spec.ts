import { test, expect } from '@playwright/test'
import { BASE_URL, VIEWPORTS } from './test-utils'

test.describe('Home Page Responsive Design', () => {
  test('responsive layout integrity', async ({ page }) => {
    await page.goto(BASE_URL)

    const viewportSizes = [
      VIEWPORTS.mobile, // Mobile
      VIEWPORTS.tablet, // Tablet
      VIEWPORTS.desktop, // Desktop
    ]

    for (const viewport of viewportSizes) {
      await page.setViewportSize(viewport)

      // Test that main structure remains intact
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

  // WCAG 2.1 SC 1.4.10 (Reflow): content must not require horizontal scrolling
  // at a 320px viewport. Regressions here have come from two directions —
  // @fpkit/acss's `body { min-width: 20.3125rem }` floor, and the nav list's
  // 384px min-content width while it was `flex-wrap: nowrap`.
  test('no horizontal scrolling at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  test('every nav link stays reachable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto('/')

    const links = page.locator('body > nav > ul a')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      // The nav wraps to two rows at this width. If a wrapped row overflows
      // its container it gets painted underneath <header>, leaving the links
      // visible to the DOM but unclickable — the trial click's hit-target
      // check is what catches that.
      await links.nth(i).click({ trial: true, timeout: 5000 })
    }
  })
})
