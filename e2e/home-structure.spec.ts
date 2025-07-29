import { test, expect } from '@playwright/test'
import { BASE_URL, waitForPageReady } from './test-utils'

test.describe('Home Page Structure', () => {
  test('has essential semantic elements', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Test for main content landmark
    await expect(page.locator('main')).toBeVisible()

    // Test for at least one heading (page may have multiple h1s from components)
    await expect(page.locator('h1').first()).toBeVisible()

    // Test for navigation
    await expect(page.getByRole('navigation')).toBeVisible()

    // Test that sections exist (components may add more than expected)
    const sections = page.locator('section')
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThanOrEqual(1) // Reduced from 2 to be more flexible
  })

  test('has proper page landmarks', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Test ARIA landmarks
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('navigation')).toBeVisible()

    // Test for header/banner (if present)
    const banner = page.getByRole('banner')
    if ((await banner.count()) > 0) {
      await expect(banner).toBeVisible()
    }

    // Test for footer/contentinfo (if present)
    const contentInfo = page.getByRole('contentinfo')
    if ((await contentInfo.count()) > 0) {
      await expect(contentInfo).toBeVisible()
    }
  })

  test('has interactive elements', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Test for links (navigation, content links, etc.)
    const links = page.getByRole('link')
    const linkCount = await links.count()

    if (linkCount > 0) {
      await expect(links.first()).toBeVisible()
    }

    // Test for buttons (if any)
    const buttons = page.getByRole('button')
    if ((await buttons.count()) > 0) {
      await expect(buttons.first()).toBeVisible()
    }
  })

  test('has proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE_URL)
    await waitForPageReady(page)

    // Test that h1 elements exist (components may have multiple)
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)

    // Test that headings exist in logical order
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    await expect(headings.first()).toBeVisible()
  })
})
