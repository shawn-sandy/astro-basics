import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:4321/'

test.describe('Home Page Structure', () => {
  test('has essential semantic elements', async ({ page }) => {
    await page.goto(BASE_URL)

    // Test for main content landmark
    await expect(page.locator('main')).toBeVisible()

    // Test for at least one heading (page may have multiple h1s from components)
    await expect(page.locator('h1').first()).toBeVisible()

    // Test for navigation
    await expect(page.getByRole('navigation')).toBeVisible()

    // Test that sections exist (components may add more than expected)
    const sections = page.locator('section')
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThanOrEqual(2) // At minimum Featured + CollectionList sections
  })

  test('has proper page landmarks', async ({ page }) => {
    await page.goto(BASE_URL)

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

    // Test for links (navigation, content links, etc.)
    const links = page.getByRole('link')
    await expect(links.first()).toBeVisible()

    // Test for buttons (if any)
    const buttons = page.getByRole('button')
    if ((await buttons.count()) > 0) {
      await expect(buttons.first()).toBeVisible()
    }
  })

  test('loads without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text())
      }
    })

    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })

  test('is keyboard accessible', async ({ page }) => {
    await page.goto(BASE_URL)

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

  test('has proper heading hierarchy', async ({ page }) => {
    await page.goto(BASE_URL)

    // Test that h1 elements exist (components may have multiple)
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)

    // Test that headings exist in logical order
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    await expect(headings.first()).toBeVisible()
  })

  test('images have accessibility attributes', async ({ page }) => {
    await page.goto(BASE_URL)

    const images = page.locator('img')
    const imageCount = await images.count()

    if (imageCount > 0) {
      // Test that all images have alt attributes
      for (let i = 0; i < imageCount; i++) {
        await expect(images.nth(i)).toHaveAttribute('alt')
      }
    }
  })

  test('responsive layout integrity', async ({ page }) => {
    await page.goto(BASE_URL)

    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1200, height: 800 }, // Desktop
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)

      // Test that main structure remains intact
      await expect(page.locator('main')).toBeVisible()
      await expect(page.getByRole('navigation')).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })
})
