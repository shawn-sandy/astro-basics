import { test, expect } from '@playwright/test'
import { BASE_URL } from './test-utils'

test.describe('Home Page Performance', () => {
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
})
