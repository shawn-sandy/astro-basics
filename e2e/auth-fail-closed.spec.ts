import { test, expect } from '@playwright/test'

// Runs against a server with no Clerk keys, as a fresh clone or CI's preview build is.
// Protected routes must refuse with a 503 setup notice, never render or redirect.

for (const path of ['/dashboard', '/dashboard/users', '/organization']) {
  test(`${path} fails closed without Clerk keys`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(503)
  })
}

test('the unauthenticated sync-user test endpoint is gone', async ({ request }) => {
  const response = await request.post('/api/test/sync-user', { data: { userId: 'user_123' } })
  expect(response.status()).toBe(404)
})
