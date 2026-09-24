import { test, expect } from '@playwright/test'

/**
 * Horizontal rules are quiet separators, so they paint in the direction's
 * `--rule` token like every other hairline on the site.
 *
 * @fpkit/acss colours `hr` with `--color-border-subtle`, a step on the legacy
 * neutral scale, which `_design-tokens.scss` inverts in dark mode. Measured
 * before the fix: #3f3f46 on the dark homepage and #f4f4f5 on the dark blog
 * list -- lines louder than the headings they separated -- and the off-palette
 * #e4e4e7 in light.
 *
 * Uses relative `page.goto` so the suite follows `use.baseURL`.
 */
for (const colorScheme of ['light', 'dark'] as const) {
  test(`dividers paint in the --rule token (${colorScheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })

    for (const path of ['/', '/posts/1']) {
      await page.goto(path)

      const measured = await page.evaluate(() => {
        // Resolve the token through a probe so both sides are `rgb()` strings.
        const probe = document.createElement('span')
        probe.style.color = 'var(--rule)'
        document.body.appendChild(probe)
        const rule = getComputedStyle(probe).color
        probe.remove()

        const rules = [...document.querySelectorAll('main hr, aside hr')].map(
          hr => getComputedStyle(hr).borderBottomColor
        )
        return { rule, rules }
      })

      expect(measured.rules.length, `${path} rendered no <hr> to check`).toBeGreaterThan(0)
      for (const color of measured.rules) {
        expect(color, `${colorScheme} ${path}: <hr> is not --rule`).toBe(measured.rule)
      }
    }
  })
}
