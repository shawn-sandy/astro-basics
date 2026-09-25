// @vitest-environment node
import { readFileSync } from 'node:fs'
// `URL` is imported rather than taken from the global scope: the ESLint test
// override declares no Node globals, so the bare global trips `no-undef`.
import { URL, fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import AccountPanel from '#components/dashboard/AccountPanel.astro'
import ActivityFeed from '#components/dashboard/ActivityFeed.astro'
import DashboardPage from '#components/dashboard/DashboardPage.astro'
import DashboardSection from '#components/dashboard/DashboardSection.astro'
import DashboardSidebar from '#components/dashboard/DashboardSidebar.astro'
import PostPreview from '#components/dashboard/PostPreview.astro'
import StatsCards from '#components/dashboard/StatsCards.astro'
import ProfilePage from '#pages/profile/index.astro'

/** Render a component to an HTML string with the given props and slot markup. */
async function render(
  component: unknown,
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {}
): Promise<string> {
  const container = await AstroContainer.create()
  // The container's typing wants an AstroComponentFactory; the imported .astro modules are one.
  return container.renderToString(component as Parameters<typeof container.renderToString>[0], {
    props,
    slots,
  })
}

/** Every opening `<a …>` tag whose markup contains `needle`. */
function anchorsWith(html: string, needle: string): string[] {
  return (html.match(/<a\b[^>]*>/g) ?? []).filter(tag => tag.includes(needle))
}

describe('DashboardSidebar current link', () => {
  it('marks only the link for the current path, ignoring a trailing slash', async () => {
    const html = await render(DashboardSidebar, { currentPath: '/dashboard/' })
    const current = (html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? []).map(
      tag => /href="([^"]*)"/.exec(tag)?.[1]
    )

    expect(current).toEqual(['/dashboard'])
  })

  it('moves the mark when the path changes', async () => {
    const html = await render(DashboardSidebar, { currentPath: '/profile' })

    expect(anchorsWith(html, 'href="/profile"')[0]).toContain('aria-current="page"')
    expect(anchorsWith(html, 'href="/dashboard"')[0]).not.toContain('aria-current')
  })

  it('keeps the brand, links and account controls inside one navigation landmark', async () => {
    // Script tags are not content; the component's resize handler renders after the nav.
    const html = (await render(DashboardSidebar, { currentPath: '/dashboard' }))
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      .trim()
    const navs = html.match(/<nav\b[^>]*>/g) ?? []

    // axe's `region` rule flags content outside landmarks; the whole sidebar is the landmark.
    expect(navs).toHaveLength(1)
    expect(navs[0]).toMatch(/aria-label="[^"]+"/)
    expect(html.startsWith('<nav')).toBe(true)
    expect(html.trimEnd().endsWith('</nav>')).toBe(true)
  })

  it('keeps an account button outside the popover, so its portaled menu cannot dismiss it', async () => {
    // Clerk renders the account menu outside the sidebar; a click in it counts as
    // an outside click and light-dismisses a popover that holds the button.
    const html = await render(DashboardSidebar, { currentPath: '/dashboard' })
    const [bar] = html.split(/<div\b[^>]*\bpopover=/)

    expect(bar).toMatch(/clerk-user-button/)
  })

  it('wires the menu button to the popover panel that holds the links', async () => {
    const html = await render(DashboardSidebar, { currentPath: '/dashboard' })
    const target = /popovertarget="([^"]+)"/.exec(html)?.[1]

    expect(target).toBeTruthy()
    expect(html).toMatch(new RegExp(`id="${target}"[^>]*popover=`))
  })
})

describe('AccountPanel', () => {
  it('shows the account facts it is given', async () => {
    const html = await render(AccountPanel, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      emailVerified: true,
      role: 'super_admin',
      lastSignIn: 'Sep 25, 2026, 02:30 PM',
    })

    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('ada@example.com')
    expect(html).toContain('Sep 25, 2026, 02:30 PM')
    // Role keys are shown in words, not as the raw snake_case key.
    expect(html).toContain('super admin')
    expect(html).not.toContain('super_admin')
    expect(html).toContain('status-pill--success')
  })

  it('shows an unverified email in the neutral tone', async () => {
    const html = await render(AccountPanel, { email: 'ada@example.com', emailVerified: false })

    expect(html).toContain('status-pill--neutral')
    expect(html).not.toContain('status-pill--success')
  })

  it('drops the facts list and still names the panel when there is no user data', async () => {
    const html = await render(AccountPanel)
    const name = /class="account-panel__name[^"]*"[^>]*>([^<]*)</.exec(html)?.[1]?.trim()

    expect(html).not.toContain('<dl')
    expect(name).toBeTruthy()
    expect(html).toMatch(/href="\/profile"/)
  })
})

describe('ActivityFeed icons', () => {
  it('draws a line icon for a known name and keeps other strings as text', async () => {
    const html = await render(ActivityFeed, {
      activities: [
        { icon: 'file', content: 'Published', timestamp: 'now' },
        { icon: '📝', content: 'Legacy emoji', timestamp: 'then' },
      ],
    })
    // Astro appends its scope class, so match the class as a prefix.
    const icons = html.match(/<span class="activity-icon[^"]*"[^>]*>[\s\S]*?<\/span>/g) ?? []

    expect(icons).toHaveLength(2)
    expect(icons[0]).toContain('<svg')
    expect(icons[1]).not.toContain('<svg')
    expect(icons[1]).toContain('📝')
  })
})

describe('PostPreview edit links', () => {
  it('renders a named edit link only for posts that have an href', async () => {
    const html = await render(PostPreview, {
      posts: [
        { title: 'With link', excerpt: '', status: 'Published', date: 'now', href: '/admin/posts' },
        { title: 'Without link', excerpt: '', status: 'Draft', date: 'then' },
      ],
    })
    const edits = html.match(/<a\b[^>]*class="post-item__edit[^"]*"[^>]*>/g) ?? []

    expect(edits).toHaveLength(1)
    expect(edits[0]).toContain('aria-label="Edit With link"')
  })
})

describe('DashboardPage', () => {
  it('renders the title as the page heading with the content after it', async () => {
    const html = await render(
      DashboardPage,
      { eyebrow: 'Messages', title: 'Message Center' },
      { default: '<p id="body">Inbox</p>' }
    )

    expect(html).toMatch(/<h1\b[^>]*>Message Center<\/h1>/)
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('id="body"'))
  })

  it('renders the actions area only when actions are passed', async () => {
    const props = { eyebrow: 'Overview', title: 'Welcome back' }
    const without = await render(DashboardPage, props)
    const withActions = await render(DashboardPage, props, { actions: '<a href="/">View site</a>' })

    expect(without).not.toContain('dashboard-page__actions')
    expect(withActions).toMatch(/dashboard-page__actions[^>]*>\s*<a href="\/">View site<\/a>/)
  })
})

describe('Profile page in the dashboard shell', () => {
  it('never skips a heading level after the page title', async () => {
    // Signed-out render: no user details, so no UserInfo name heading sits in between.
    const html = await render(ProfilePage)
    const headings = [...html.matchAll(/<h([1-6])\b([^>]*)>/g)].map(match => ({
      level: Number(match[1]),
      attrs: match[2],
    }))
    const levels = headings.map(heading => heading.level)
    const firstH1 = levels.indexOf(1)
    const afterTitle = levels.slice(firstH1)

    // The first h1 must be the page's own title, not the signed-out message's.
    expect(headings[firstH1]?.attrs).toContain('dashboard-page__title')
    for (let i = 1; i < afterTitle.length; i++) {
      expect(afterTitle[i] - afterTitle[i - 1]).toBeLessThanOrEqual(1)
    }
  })
})

describe('Heading ids', () => {
  /** The `id` of each heading and the `aria-labelledby` of each labelled region. */
  const ids = (html: string) => ({
    headings: [...html.matchAll(/<h2\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]),
    labels: [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(match => match[1]),
  })

  it('stay unique when two sections share a title, and still label their region', async () => {
    const first = ids(await render(DashboardSection, { title: 'Recent posts' }))
    const second = ids(await render(DashboardSection, { title: 'Recent posts' }))

    expect(first.labels).toEqual(first.headings)
    expect(second.labels).toEqual(second.headings)
    expect(first.headings[0]).not.toBe(second.headings[0])
  })

  it('stay unique across two account panels on one page', async () => {
    const first = ids(await render(AccountPanel))
    const second = ids(await render(AccountPanel))

    expect(first.labels).toEqual(first.headings)
    expect(first.headings[0]).not.toBe(second.headings[0])
  })
})

describe('StatsCards icons', () => {
  it('draws a line icon for a known name and keeps other strings as text', async () => {
    const html = await render(StatsCards, {
      stats: [
        { title: 'Posts', value: '24', icon: 'file' },
        { title: 'Likes', value: '456', icon: '❤️' },
      ],
    })
    const icons = html.match(/<span class="stat-icon[^"]*"[^>]*>[\s\S]*?<\/span>/g) ?? []

    expect(icons).toHaveLength(2)
    expect(icons[0]).toContain('<svg')
    expect(icons[0]).not.toContain('>file<')
    expect(icons[1]).toContain('❤️')
  })
})

describe('DashboardSidebar without the popover API', () => {
  /**
   * Flatten the component's `<style>` block into rules, each with the at-rule
   * preludes it sits under. Braces are walked rather than regex-matched so nested
   * `@supports` and `@media` blocks are attributed correctly.
   */
  function sidebarRules(): { selector: string; body: string; conditions: string[] }[] {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../src/components/dashboard/DashboardSidebar.astro', import.meta.url)
      ),
      'utf8'
    )
    const css = (/<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? '').replace(
      /\/\*[\s\S]*?\*\//g,
      ''
    )
    const rules: { selector: string; body: string; conditions: string[] }[] = []
    const walk = (text: string, conditions: string[]) => {
      let prelude = ''
      for (let i = 0; i < text.length; i += 1) {
        if (text[i] === '{') {
          let depth = 0
          let close = i
          for (; close < text.length; close += 1) {
            if (text[close] === '{') depth += 1
            else if (text[close] === '}' && --depth === 0) break
          }
          const inner = text.slice(i + 1, close)
          const head = prelude.trim()
          if (head.startsWith('@')) walk(inner, [...conditions, head])
          else rules.push({ selector: head, body: inner, conditions })
          prelude = ''
          i = close
        } else if (text[i] === '}' || text[i] === ';') prelude = ''
        else prelude += text[i]
      }
    }
    walk(css, [])
    return rules
  }

  const SUPPORTED = /^@supports\s+selector\(\s*:popover-open\s*\)$/
  const UNSUPPORTED = /^@supports\s+not\s+selector\(\s*:popover-open\s*\)$/

  it('only takes the menu panel out of flow where popovers are supported', () => {
    // Where `popover` is ignored, a fixed panel never hides and covers the page.
    const fixedPanels = sidebarRules().filter(
      rule =>
        rule.selector.includes('dashboard-sidebar__panel') && /position\s*:\s*fixed/.test(rule.body)
    )

    expect(fixedPanels.length).toBeGreaterThan(0)
    for (const rule of fixedPanels) expect(rule.conditions.some(c => SUPPORTED.test(c))).toBe(true)
  })

  it('lists the links in flow and hides the inert menu button where popovers are unsupported', () => {
    const fallback = sidebarRules().filter(rule => rule.conditions.some(c => UNSUPPORTED.test(c)))
    const panel = fallback.find(rule => rule.selector.includes('dashboard-sidebar__panel'))
    const button = fallback.find(rule => rule.selector.includes('dashboard-sidebar__menu'))

    expect(panel?.body).toMatch(/display\s*:\s*(?!none)[a-z]/)
    expect(button?.body).toMatch(/display\s*:\s*none/)
  })
})
