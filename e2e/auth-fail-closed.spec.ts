import { URL } from 'node:url'
import { test, expect } from '@playwright/test'

// Runs against a server with no Clerk keys, as a fresh clone or CI's preview build is.
// Protected routes must refuse with a 503 setup notice, never render or redirect, and
// public pages must load with no Clerk error and every island hydrated.

// The paths with no page, and the upper-case one, only reach the notice through the middleware's
// backstop, so a backstop that stops following Astro's routed path fails here as a 404.
for (const path of [
  '/dashboard',
  '/dashboard/users',
  '/organization',
  '/%64ashboard',
  '/dashboard/%75sers',
  '/DASHBOARD',
  '/dashboard/nope',
  '/%64ashboard/nope',
  '/%2564ashboard/nope',
  '//dashboard/nope',
  '/organization/members',
]) {
  test(`${path} fails closed without Clerk keys`, async ({ request, baseURL }) => {
    // A full URL, because a relative `//dashboard` would resolve as a host name.
    const response = await request.get(`${baseURL}${path}`, { maxRedirects: 0 })
    expect(response.status()).toBe(503)
  })
}

test('the unauthenticated sync-user test endpoint is gone', async ({ request }) => {
  const response = await request.post('/api/test/sync-user', { data: { userId: 'user_123' } })
  expect(response.status()).toBe(404)
})

test('a public page loads without Clerk errors and hydrates its islands', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/about')

  // Auto-waits, so a cold dev server's dependency-optimization reload cannot empty the page.
  await expect(page.locator('astro-island').first()).toBeAttached()
  // Astro removes `ssr` from an island once it hydrates.
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0)
  expect(errors.filter(message => message.includes('Missing publishableKey'))).toEqual([])
})

// Islands await the before-hydration script before they start, and Clerk's copy throws when it
// runs first without a key. Ordinary loads only lose that race sometimes, so force the order.
test('the before-hydration script resolves when it runs first', async ({ page }) => {
  await page.goto('/about')

  const url = await page.locator('astro-island').first().getAttribute('before-hydration-url')
  // No before-hydration script (production builds without Clerk's): islands wait on nothing.
  if (!url) return

  const result = await page.evaluate(async src => {
    const frame = document.createElement('iframe')
    const loaded = new Promise(resolve => frame.addEventListener('load', resolve, { once: true }))
    frame.srcdoc = '<!doctype html><title>before-hydration probe</title>'
    document.body.append(frame)
    await loaded
    const frameWindow = frame.contentWindow as typeof globalThis
    return frameWindow.eval(`import(${JSON.stringify(src)})`).then(
      () => 'resolved',
      (error: Error) => `rejected: ${error.message}`
    )
  }, new URL(url, page.url()).href)

  expect(result).toBe('resolved')
})
