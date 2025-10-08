import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    // Vitest configuration options
    // exclude e2e test folder
    exclude: ['**/e2e/**', '**/__tests__/**', '**/node_modules/**'],
    // Enable React testing with happy-dom
    environment: 'happy-dom',
    // Setup files for React testing
    setupFiles: ['./tests/setup.ts'],
  },
})
