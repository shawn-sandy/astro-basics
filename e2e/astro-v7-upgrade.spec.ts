import { test, expect } from '@playwright/test'

// Objective-verification test for the Astro v6 -> v7 upgrade.
// Must pass on v6 (this PR), stay green through the v7 bump, and
// through the 3-adapter CI matrix. Proves the framework actually
// renders end-to-end, not just that `npm install` resolved.

test('home page renders', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
})

test('published blog post renders', async ({ page }) => {
  const response = await page.goto('/posts/post-2')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
})

test('rss feed is served', async ({ page }) => {
  const response = await page.goto('/rss.xml')
  expect(response?.status()).toBe(200)
  const body = await response?.text()
  expect(body).toContain('<rss')
})

test('starlight guide renders', async ({ page }) => {
  const response = await page.goto('/guide/getting-started')
  expect(response?.status()).toBe(200)
  await expect(page.locator('h1')).toBeVisible()
})

test('home to blog to post navigation has no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/')
  await page.goto('/blog')
  await page.goto('/posts/post-2')
  await page.goto('/guide/getting-started')

  expect(errors).toEqual([])
})
