import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    // Vitest configuration options
    // exclude e2e test folder
    exclude: ['**/e2e/**', '**/__tests__/**', '**/node_modules/**'],
  },
})
