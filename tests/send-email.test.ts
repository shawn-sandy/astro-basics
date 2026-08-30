import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import { getNotificationAddress, isEmailConfigured, sendEmail } from '#utils/email'

/**
 * `sendEmail` is called from handlers whose primary work has already succeeded,
 * so every path here asserts the same contract: report failure, never throw.
 */
describe('sendEmail', () => {
  const original = { ...process.env }

  const configure = () => {
    process.env.EMAIL_PROVIDER = 'postmark'
    process.env.EMAIL_PROVIDER_API_KEY = 'token'
    process.env.EMAIL_FROM_ADDRESS = 'no-reply@example.com'
  }

  const options = {
    template: 'welcome',
    to: 'user@example.com',
    subject: 'Welcome',
    parameters: { name: 'Ada' },
  } as const

  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER
    delete process.env.EMAIL_PROVIDER_API_KEY
    delete process.env.EMAIL_FROM_ADDRESS
    delete process.env.EMAIL_TO_ADDRESS
    delete process.env.EMAIL_MAILGUN_DOMAIN
    delete process.env.EMAIL_MAILGUN_REGION
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = { ...original }
    // `unstubAllGlobals`, not `restoreAllMocks`: `restoreAllMocks` leaves
    // `vi.stubGlobal('fetch', ...)` installed, so one test's stub would still
    // be answering calls in the next.
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('reports not-configured without attempting a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    expect(isEmailConfigured()).toBe(false)
    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: 'not-configured' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an incomplete configuration as not configured', async () => {
    process.env.EMAIL_PROVIDER = 'postmark'
    // API key and from address deliberately absent.
    expect(isEmailConfigured()).toBe(false)
    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: 'not-configured' })
  })

  it('rejects an unsupported provider name rather than guessing', async () => {
    configure()
    process.env.EMAIL_PROVIDER = 'resend'
    expect(isEmailConfigured()).toBe(false)
  })

  it('treats the .env.example placeholders as unconfigured', async () => {
    // Copying .env.example to .env must leave email off, not configured-but-broken.
    process.env.EMAIL_PROVIDER = 'postmark'
    process.env.EMAIL_PROVIDER_API_KEY = 'YOUR_EMAIL_PROVIDER_API_KEY'
    process.env.EMAIL_FROM_ADDRESS = 'YOUR_EMAIL_FROM_ADDRESS'
    process.env.EMAIL_TO_ADDRESS = 'YOUR_EMAIL_TO_ADDRESS'

    expect(isEmailConfigured()).toBe(false)
    expect(getNotificationAddress()).toBeNull()
    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: 'not-configured' })
  })

  it('treats mailgun without a domain as unconfigured, not as a per-send failure', async () => {
    process.env.EMAIL_PROVIDER = 'mailgun'
    process.env.EMAIL_PROVIDER_API_KEY = 'key'
    process.env.EMAIL_FROM_ADDRESS = 'no-reply@example.com'

    expect(isEmailConfigured()).toBe(false)

    process.env.EMAIL_MAILGUN_DOMAIN = 'mg.example.com'
    expect(isEmailConfigured()).toBe(true)
  })

  it('strips CR/LF from header fields so a subject cannot inject a header', async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail({
      ...options,
      subject: 'Hello\nBcc: victim@example.com',
      replyTo: 'sender@example.com\r\nX-Evil: 1',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.Subject).toBe('Hello Bcc: victim@example.com')
    expect(body.Subject).not.toMatch(/[\r\n]/)
    expect(body.ReplyTo).toBe('sender@example.com X-Evil: 1')
    expect(body.ReplyTo).not.toMatch(/[\r\n]/)
  })

  it('bounds the provider call so a hung provider cannot hang the request', async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail(options)

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it('sends the rendered template when configured', async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendEmail(options)).resolves.toEqual({ sent: true })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.To).toBe('user@example.com')
    expect(body.From).toBe('no-reply@example.com')
    expect(body.HtmlBody).toContain('Welcome, Ada')
    // The placeholder must not survive into the delivered mail.
    expect(body.HtmlBody).not.toContain('{{name}}')
  })

  it('honours a per-send from address', async () => {
    configure()
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendEmail({ ...options, from: 'team@example.com' })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).From).toBe('team@example.com')
  })

  it('reports provider-error on a non-2xx response', async () => {
    configure()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 500 })))

    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: 'provider-error' })
  })

  it('reports network-error when fetch rejects, instead of propagating', async () => {
    configure()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))

    await expect(sendEmail(options)).resolves.toEqual({ sent: false, reason: 'network-error' })
  })

  it('reports unknown-template when the name has no compiled template', async () => {
    configure()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendEmail({
      ...options,
      // Simulates a deleted template whose call site still refers to it.
      template: 'no-such-template' as typeof options.template,
    })

    expect(result).toEqual({ sent: false, reason: 'unknown-template' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
