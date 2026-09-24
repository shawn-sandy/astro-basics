import { test, expect, type Page } from '@playwright/test'

/**
 * The site theme toggle in the navigation bar.
 *
 * `_design-tokens.scss` already flips every surface under `:root[data-theme]`;
 * these tests prove the toggle drives that attribute, remembers the choice,
 * applies it before first paint, and leaves the OS preference in charge until
 * the visitor makes one.
 *
 * Uses relative `page.goto` so the suite follows `use.baseURL`.
 */

/** `--paper` in each direction, as `getComputedStyle` reports it. */
const PAPER = { light: 'rgb(252, 252, 253)', dark: 'rgb(13, 16, 20)' } as const

const toggle = (page: Page) => page.locator('[data-theme-toggle]')
const bodyBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test.describe('Theme toggle', () => {
  test('switches a light-preferring visitor to dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')

    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
    expect(await bodyBackground(page)).toBe(PAPER.light)

    await toggle(page).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => bodyBackground(page)).toBe(PAPER.dark)
  })

  test('switches a dark-preferring visitor to light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')

    await toggle(page).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => bodyBackground(page)).toBe(PAPER.light)
  })

  test('restores the choice before first paint on the next load', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await toggle(page).click()

    // Records the root's theme the moment `<body>` is inserted. Only `<head>`
    // scripts have run by then, so a value here means the saved choice lands
    // before the first paint instead of flashing the OS theme first. Observes
    // `document`, not `documentElement`: init scripts run before `<html>` exists.
    await page.addInitScript(() => {
      const probe = window as unknown as { themeAtBody?: string | null }
      new window.MutationObserver((_, observer) => {
        if (!document.body) return
        probe.themeAtBody = document.documentElement.dataset.theme ?? null
        observer.disconnect()
      }).observe(document, { childList: true, subtree: true })
    })
    await page.reload()

    const themeAtBody = await page.evaluate(
      () => (window as unknown as { themeAtBody?: string | null }).themeAtBody
    )
    expect(themeAtBody).toBe('dark')
  })

  test('states a restored dark theme before the bundled script runs', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await toggle(page).click()

    // `readyState` turns `interactive` when parsing ends and BEFORE deferred
    // module scripts run, so this reads what the markup and any parse-time
    // script left behind -- not what the bundled script corrected later.
    await page.addInitScript(() => {
      const probe = window as unknown as { pressedAtParse?: string | null }
      document.addEventListener('readystatechange', () => {
        if (document.readyState !== 'interactive') return
        probe.pressedAtParse =
          document.querySelector('[data-theme-toggle]')?.getAttribute('aria-pressed') ?? null
      })
    })
    await page.reload()

    const pressedAtParse = await page.evaluate(
      () => (window as unknown as { pressedAtParse?: string | null }).pressedAtParse
    )
    expect(pressedAtParse).toBe('true')
  })

  test('follows the OS preference until the visitor chooses', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    // No stamped attribute: the `prefers-color-scheme` block stays in charge,
    // so an OS switch mid-visit still repaints the page.
    expect(await page.locator('html').getAttribute('data-theme')).toBeNull()
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')

    await page.emulateMedia({ colorScheme: 'light' })

    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(() => bodyBackground(page)).toBe(PAPER.light)
  })

  test('shares the choice with the Starlight docs', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await toggle(page).click()

    // Starlight resolves an unset preference to the OS theme, which is light
    // here, so `dark` can only come from the stored choice.
    await page.goto('/guide/components/')

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
