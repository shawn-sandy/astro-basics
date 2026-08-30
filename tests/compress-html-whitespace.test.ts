// @vitest-environment node
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import InlineWhitespace from './fixtures/InlineWhitespace.astro'

// Guards the compressHTML default change (v7: 'jsx', was `true` on v6).
// 'jsx' strips inter-element whitespace, which can silently swallow the
// space between adjacent inline elements (nav links, badges). This test
// renders a fixture and asserts that space survives.
describe('inline-element whitespace under compressHTML', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('keeps a single space between adjacent <a> elements', async () => {
    const container = await AstroContainer.create()
    const result = await container.renderToString(InlineWhitespace)

    expect(result).toMatch(/One<\/a>\s+<a[^>]*>Two/)
    expect(result).toMatch(/Alpha<\/span>\s+<span[^>]*>Beta/)
  })
})
