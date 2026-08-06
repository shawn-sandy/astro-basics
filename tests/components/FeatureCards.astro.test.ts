// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { loadRenderers } from 'astro:container'
import { getContainerRenderer } from '@astrojs/react/container-renderer'
import FeatureCards from '#components/astro/FeatureCards.astro'
import { getAllFeatures, getFeaturesByCategory, getTopFeatures } from '#/data/features'

/**
 * FeatureCards nests `Card`, which renders the React-based `Card` primitive from
 * `@fpkit/acss`. Without the React container renderer the container throws
 * `NoMatchingRenderer`, so every render in this file goes through `render()`.
 */
const render = async (props?: Record<string, unknown>): Promise<string> => {
  const renderers = await loadRenderers([getContainerRenderer()])
  const container = await AstroContainer.create({ renderers })
  return container.renderToString(FeatureCards, props ? { props } : {})
}

/** Number of opening `<tag>` elements in the rendered markup. */
function countTag(html: string, tag: string): number {
  return html.match(new RegExp(`<${tag}\\b`, 'g'))?.length ?? 0
}

/**
 * Number of elements carrying `name` as an attribute.
 *
 * The lookahead is what keeps `data-card` from also counting `data-card-code`:
 * the marker has to be followed by whitespace, `=` or `>` to count.
 */
function countAttr(html: string, name: string): number {
  return html.match(new RegExp(`\\s${name}(?=[\\s>=])`, 'g'))?.length ?? 0
}

/** Text content of every `<hN>` element, inner tags stripped and entities left as-is. */
function headingTexts(html: string, level: number): string[] {
  const matches = html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, 'g'))
  return [...matches].map(m => m[1].replace(/<[^>]*>/g, '').trim())
}

/** Escape a source string the way Astro escapes interpolated text, so titles can be searched for. */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

describe('FeatureCards.astro', () => {
  describe('sectionTitle', () => {
    it('renders the supplied title as a section heading', async () => {
      // The prop was destructured but never used before this plan, so a passing
      // assertion here is the whole point: it has to reach the DOM.
      const html = await render({ sectionTitle: 'What you get' })

      expect(headingTexts(html, 2)).toContain('What you get')
    })

    it('renders no section heading when sectionTitle is omitted', async () => {
      // Cards render their own <h3>, so an empty <h2>/<h1> set is the signal that
      // the component added no heading of its own. This also guards the removal of
      // the old 'Key Features' default, which would now paint a heading nobody asked for.
      const html = await render()

      expect(headingTexts(html, 2)).toEqual([])
      expect(headingTexts(html, 1)).toEqual([])
    })
  })

  describe('promoted tiering', () => {
    it('splits the features into promoted specimens and compact rows', async () => {
      const total = getTopFeatures(6).length
      const html = await render({ promoted: 2 })

      // Promoted features stay cards and gain the code specimen; the remainder
      // become list rows and are no longer cards at all.
      expect(countAttr(html, 'data-card')).toBe(2)
      expect(countAttr(html, 'data-card-code')).toBe(2)
      expect(countTag(html, 'li')).toBe(total - 2)
    })

    it('loses no feature when tiering', async () => {
      const features = getTopFeatures(6)
      const html = await render({ promoted: 2 })

      for (const feature of features) {
        expect(html).toContain(escapeText(feature.title))
      }
    })

    it('renders no compact tier when every feature is promoted', async () => {
      const total = getTopFeatures(6).length
      const html = await render({ promoted: total })

      expect(countAttr(html, 'data-card')).toBe(total)
      expect(countTag(html, 'li')).toBe(0)
    })

    it('emits the import line that reproduces a promoted card', async () => {
      // The specimen exists to show the source next to the rendered component;
      // a <pre> holding only the description would satisfy the counts above.
      const [first] = getTopFeatures(6)
      const html = await render({ promoted: 1 })
      const specimen = /<pre\b[^>]*\sdata-card-code[^>]*>([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? ''

      expect(specimen).toContain('#components/astro/Card.astro')
      expect(specimen).toContain(escapeText(first.title))
    })
  })

  describe('backward compatibility of the public signature', () => {
    // FeatureCards is a package export (src/components/index.ts), so the
    // pre-existing prop set alone must still produce exactly the previous output:
    // one flat three-column row of equal cards, no heading, no tiering.
    it('renders the current six-card row for the default prop set', async () => {
      const html = await render()

      expect(countAttr(html, 'data-card')).toBe(6)
      expect(countAttr(html, 'data-card-code')).toBe(0)
      expect(countTag(html, 'li')).toBe(0)
      expect(html).toMatch(/<div\b[^>]*\sdata-flex="cols-3"/)
    })

    it('produces identical markup whether or not promoted is passed explicitly', async () => {
      // promoted: 0 is the documented default, so the new prop cannot have shifted
      // the untouched call sites onto a different branch.
      expect(await render({ promoted: 0 })).toBe(await render())
    })

    it('still honours count, showAll and category with no new props supplied', async () => {
      // Expected counts come from the data module rather than literals so the
      // assertion tracks the prop-to-selector mapping, not the current feature list.
      const [byCount, all, byCategory] = await Promise.all([
        render({ count: 3, className: 'features' }),
        render({ showAll: true, className: 'features' }),
        render({ category: 'development', className: 'features' }),
      ])

      expect(countAttr(byCount, 'data-card')).toBe(getTopFeatures(3).length)
      expect(countAttr(all, 'data-card')).toBe(getAllFeatures().length)
      expect(countAttr(byCategory, 'data-card')).toBe(getFeaturesByCategory('development').length)

      // None of the pre-existing props may switch on the tiered branch.
      for (const html of [byCount, all, byCategory]) {
        expect(countAttr(html, 'data-card-code')).toBe(0)
        expect(countTag(html, 'li')).toBe(0)
      }
    })
  })
})
