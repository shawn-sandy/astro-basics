// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import AccountPanel from '#components/dashboard/AccountPanel.astro'
import ActivityFeed from '#components/dashboard/ActivityFeed.astro'
import DashboardPage from '#components/dashboard/DashboardPage.astro'
import DashboardSidebar from '#components/dashboard/DashboardSidebar.astro'
import PostPreview from '#components/dashboard/PostPreview.astro'
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
    const html = (await render(DashboardSidebar, { currentPath: '/dashboard' })).trim()
    const navs = html.match(/<nav\b[^>]*>/g) ?? []

    // axe's `region` rule flags content outside landmarks; the whole sidebar is the landmark.
    expect(navs).toHaveLength(1)
    expect(navs[0]).toMatch(/aria-label="[^"]+"/)
    expect(html.startsWith('<nav')).toBe(true)
    expect(html.trimEnd().endsWith('</nav>')).toBe(true)
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
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1]))
    const firstH1 = levels.indexOf(1)
    const afterTitle = levels.slice(firstH1)

    expect(firstH1).toBeGreaterThanOrEqual(0)
    for (let i = 1; i < afterTitle.length; i++) {
      expect(afterTitle[i] - afterTitle[i - 1]).toBeLessThanOrEqual(1)
    }
  })
})
