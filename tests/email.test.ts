import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import { extractPlaceholders } from '#integrations/email/templates'
import { escapeHtml, renderTemplate } from '#integrations/email/render'
import { isProviderName, sendViaProvider } from '#integrations/email/providers'

describe('renderTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('substitutes placeholders, with or without inner spacing', () => {
    expect(renderTemplate('<p>{{name}} / {{ other }}</p>', { name: 'Ada', other: 'Grace' })).toBe(
      '<p>Ada / Grace</p>'
    )
  })

  it('escapes HTML in interpolated values', () => {
    const html = renderTemplate('<p>{{message}}</p>', {
      message: '<script>alert("xss")</script>',
    })

    expect(html).toBe('<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>')
    expect(html).not.toContain('<script>')
  })

  it('escapes a triple-brace placeholder, so there is no raw-output syntax', () => {
    // Handlebars would render {{{value}}} unescaped. Here the inner {{value}}
    // matches, so it interpolates the *escaped* value and leaves the outer
    // braces as literal text. Asserting the exact string matters: a weaker
    // `not.toContain('<img')` would also pass if the value were dropped.
    const html = renderTemplate('<p>{{{value}}}</p>', { value: '<img onerror=x>' })

    expect(html).toBe('<p>{&lt;img onerror=x&gt;}</p>')
  })

  it('renders an unknown placeholder as empty rather than throwing', () => {
    expect(renderTemplate('<p>{{missing}}</p>', {})).toBe('<p></p>')
  })

  it('joins array values', () => {
    expect(renderTemplate('<p>{{items}}</p>', { items: ['a', 'b'] })).toBe('<p>a, b</p>')
  })

  it('coerces numbers', () => {
    expect(renderTemplate('<p>{{count}}</p>', { count: 42 })).toBe('<p>42</p>')
  })
})

describe('escapeHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('escapes every character that could break out of markup', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;')
  })
})

describe('extractPlaceholders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns each referenced name once, sorted', () => {
    expect(extractPlaceholders('{{b}} {{a}} {{ b }}')).toEqual(['a', 'b'])
  })

  it('returns nothing for a template with no placeholders', () => {
    expect(extractPlaceholders('<p>static</p>')).toEqual([])
  })
})

describe('isProviderName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('accepts supported providers and rejects anything else', () => {
    expect(isProviderName('postmark')).toBe(true)
    expect(isProviderName('sendgrid')).toBe(true)
    expect(isProviderName('mailgun')).toBe(true)
    expect(isProviderName('resend')).toBe(false)
    expect(isProviderName(undefined)).toBe(false)
  })
})

describe('sendViaProvider', () => {
  const message = {
    from: 'no-reply@example.com',
    to: 'user@example.com',
    subject: 'Hello',
    html: '<p>Hi</p>',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('posts to Postmark with the server token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendViaProvider('postmark', message, { apiKey: 'token' })

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.postmarkapp.com/email')
    expect(init.headers['X-Postmark-Server-Token']).toBe('token')
    expect(JSON.parse(init.body).HtmlBody).toBe('<p>Hi</p>')
  })

  it('reports a provider rejection instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad sender', { status: 422 })))

    const result = await sendViaProvider('postmark', message, { apiKey: 'token' })

    expect(result).toEqual({ ok: false, status: 422, detail: 'bad sender' })
  })

  it('fails cleanly when Mailgun has no configured domain', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendViaProvider('mailgun', message, { apiKey: 'key' })

    expect(result).toEqual({
      ok: false,
      status: 0,
      detail: 'EMAIL_MAILGUN_DOMAIN is not set',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('routes Mailgun to the EU host when the region says so', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendViaProvider('mailgun', message, {
      apiKey: 'key',
      mailgunDomain: 'mg.example.com',
      mailgunRegion: 'eu',
    })

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.eu.mailgun.net/v3/mg.example.com/messages')
  })
})
