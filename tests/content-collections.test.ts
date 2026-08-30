// @vitest-environment node
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { getCollection } from 'astro:content'

// Guards the v7 content-layer API: collections must still resolve,
// Zod schemas must still validate, and the publish filter must still work.
describe('content collections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('resolves entries for posts, docs, and content collections', async () => {
    const posts = await getCollection('posts')
    const docs = await getCollection('docs')
    const content = await getCollection('content')

    expect(posts.length).toBeGreaterThan(0)
    expect(docs.length).toBeGreaterThan(0)
    expect(Array.isArray(content)).toBe(true)
  })

  it('validates the base schema on posts entries', async () => {
    const posts = await getCollection('posts')
    for (const post of posts) {
      expect(typeof post.id).toBe('string')
      expect(typeof post.data.title).toBe('string')
      expect(post.data.pubDate).toBeInstanceOf(Date)
      expect(typeof post.data.publish).toBe('boolean')
    }
  })

  it('filters to only publish: true posts', async () => {
    const published = await getCollection('posts', ({ data }) => data.publish === true)
    expect(published.length).toBeGreaterThan(0)
    expect(published.every(p => p.data.publish === true)).toBe(true)
  })
})
