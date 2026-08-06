import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-utils'

test.describe('Home Page Accessibility', () => {
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

  /**
   * The design direction documents its contrast budget in
   * docs/plans/add-homepage-design-direction.md: ink on paper ~18:1, ink-soft
   * ~6.4:1 and island ~6.7:1 in light, with every dark variant at 6.1:1 or
   * better. Those claims are what this asserts, against the tokens the page
   * actually resolves rather than against the numbers written in the plan.
   *
   * The floor is WCAG 2.1 SC 1.4.3 Level AA for normal-size text (4.5:1); the
   * documented values sit well above it, so a drop to AA-failing means a token
   * changed without the budget being rechecked.
   *
   * Measured on the running page at the time of writing -- light: ink/paper
   * 18.04, ink-soft/paper 5.85, island/paper 6.56, ink/paper-sunk 16.63,
   * ink-soft/paper-sunk 5.39; dark: 15.82, 7.38, 6.15, 14.51, 6.77. Note that
   * ink-soft/paper measures 5.85 rather than the ~6.4 the plan's Context
   * claims. It still clears AA by a wide margin, so the gate stays at the
   * falsifiable standard (4.5) rather than at the prose estimate.
   */
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`documented contrast pairs clear WCAG AA in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')

      const measured = await page.evaluate(() => {
        // Resolve author-level token values through the browser's own colour
        // parser so the numbers match what is painted.
        const probe = document.createElement('span')
        probe.style.display = 'none'
        document.body.appendChild(probe)

        const toRgb = (value: string): [number, number, number] => {
          probe.style.color = ''
          probe.style.color = value
          const parsed = getComputedStyle(probe).color.match(/[\d.]+/g) ?? []
          return [Number(parsed[0]), Number(parsed[1]), Number(parsed[2])]
        }

        const root = getComputedStyle(document.documentElement)
        const token = (name: string) => root.getPropertyValue(name).trim()

        const luminance = ([r, g, b]: [number, number, number]) => {
          const channel = (value: number) => {
            const c = value / 255
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        }

        const ratio = (a: string, b: string) => {
          const [la, lb] = [luminance(toRgb(a)), luminance(toRgb(b))]
          const [hi, lo] = la > lb ? [la, lb] : [lb, la]
          return (hi + 0.05) / (lo + 0.05)
        }

        const tokens = {
          ink: token('--ink'),
          inkSoft: token('--ink-soft'),
          island: token('--island'),
          paper: token('--paper'),
          paperSunk: token('--paper-sunk'),
        }

        const bodyStyle = getComputedStyle(document.body)
        const rendered = ratio(bodyStyle.color, bodyStyle.backgroundColor)

        const pairs = {
          'ink / paper': ratio(tokens.ink, tokens.paper),
          'ink-soft / paper': ratio(tokens.inkSoft, tokens.paper),
          'island / paper': ratio(tokens.island, tokens.paper),
          'ink / paper-sunk': ratio(tokens.ink, tokens.paperSunk),
          'ink-soft / paper-sunk': ratio(tokens.inkSoft, tokens.paperSunk),
        }

        // Only now: getComputedStyle on a detached element returns an empty
        // declaration, which would silently turn every ratio into NaN.
        probe.remove()

        return { tokens, pairs, rendered }
      })

      // A missing token resolves to '' and would score a meaningless ratio.
      for (const [name, value] of Object.entries(measured.tokens)) {
        expect(value, `token ${name} did not resolve`).not.toBe('')
      }

      for (const [pair, value] of Object.entries(measured.pairs)) {
        // A NaN would slip past a `>=` comparison as a plain failure with no
        // clue that the measurement itself broke rather than the contrast.
        expect(Number.isFinite(value), `${colorScheme} ${pair} did not measure`).toBe(true)
        expect(value, `${colorScheme} ${pair} = ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }

      // Not just the tokens in isolation: the colours body actually paints.
      expect(
        measured.rendered,
        `${colorScheme} rendered body text on body background = ${measured.rendered.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(4.5)
    })

    /**
     * WCAG 2.1 SC 2.4.7 Focus Visible. The direction repaints every surface, so
     * a focus ring that was legible against the old white page has to be
     * re-proved against the new paper and dark surfaces. Tab is used rather
     * than `.focus()` because `:focus-visible` — which is where the ring is
     * declared — is keyboard-conditional.
     */
    test(`keyboard focus stays visible in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.goto('/')

      const before = await page.evaluate(() => {
        const first = document.querySelector<HTMLElement>('a[href], button')
        if (!first) return null
        const style = getComputedStyle(first)
        return {
          outlineWidth: parseFloat(style.outlineWidth) || 0,
          outlineStyle: style.outlineStyle,
          boxShadow: style.boxShadow,
          color: style.color,
        }
      })
      expect(before, 'no focusable link or button on the homepage').not.toBeNull()

      await page.keyboard.press('Tab')

      const after = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        const style = getComputedStyle(el)
        return {
          tag: el.tagName.toLowerCase(),
          outlineWidth: parseFloat(style.outlineWidth) || 0,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
          color: style.color,
        }
      })

      expect(after, 'Tab did not move focus off body').not.toBeNull()

      // A ring counts if it paints: a non-zero outline, a box-shadow ring, or a
      // colour change against the unfocused state.
      const hasOutline = after!.outlineWidth > 0 && after!.outlineStyle !== 'none'
      const hasShadow = after!.boxShadow !== 'none' && after!.boxShadow !== ''
      const changedColor = after!.color !== before!.color

      expect(
        hasOutline || hasShadow || changedColor,
        `${colorScheme}: focused ${after!.tag} shows no visible focus indicator (outline ${after!.outlineWidth}px ${after!.outlineStyle} ${after!.outlineColor}, box-shadow ${after!.boxShadow})`
      ).toBe(true)

      // An outline that resolves to `transparent` or to the surface it sits on
      // is not a visible indicator.
      if (hasOutline) {
        const ringContrast = await page.evaluate(outlineColor => {
          const probe = document.createElement('span')
          probe.style.display = 'none'
          document.body.appendChild(probe)
          const toRgb = (value: string) => {
            probe.style.color = ''
            probe.style.color = value
            const parts = getComputedStyle(probe).color.match(/[\d.]+/g) ?? []
            return [Number(parts[0]), Number(parts[1]), Number(parts[2])] as const
          }
          const luminance = ([r, g, b]: readonly [number, number, number]) => {
            const channel = (value: number) => {
              const c = value / 255
              return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
          }
          const ring = luminance(toRgb(outlineColor))
          const surface = luminance(toRgb(getComputedStyle(document.body).backgroundColor))
          probe.remove()
          const [hi, lo] = ring > surface ? [ring, surface] : [surface, ring]
          return (hi + 0.05) / (lo + 0.05)
        }, after!.outlineColor)

        // SC 1.4.11 Non-text Contrast: 3:1 for a UI indicator.
        expect(
          ringContrast,
          `${colorScheme}: focus ring ${after!.outlineColor} against the page surface = ${ringContrast.toFixed(2)}:1`
        ).toBeGreaterThanOrEqual(3)
      }
    })
  }
})
