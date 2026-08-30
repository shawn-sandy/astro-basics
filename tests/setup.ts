/**
 * Vitest test setup
 *
 * Configures testing environment for React component tests.
 */

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

/**
 * Suite-level hook convention (see CLAUDE-PATTERNS.md > Unit Test Structure).
 *
 * Each top-level `describe` carries `beforeEach`/`afterEach` calling
 * `vi.clearAllMocks()`. Use `clearAllMocks`, not `restoreAllMocks`:
 * `restoreAllMocks()` runs `mockRestore()` on every mock, which strips the
 * implementation from module-scope mocks built as
 * `vi.fn().mockImplementation(...)`. Several suites here set up globals that way
 * — `tests/scripts/contact-form.test.ts` stubs `global.FormData` — so restoring
 * leaves later tests in the file calling a mock that no longer does anything.
 * `clearAllMocks()` resets call history only and is safe everywhere.
 */
