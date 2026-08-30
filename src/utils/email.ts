/**
 * Email delivery.
 *
 * Sends are best-effort: nothing here throws or rejects. Callers are request
 * handlers whose primary work - persisting a contact message, syncing a new
 * user - has already succeeded, and a mail failure must not turn that into an
 * error response. Every failure path returns a result and logs.
 *
 * Templates come from the `astro-email` integration as a compiled virtual
 * module, so this module performs no filesystem access and works unchanged
 * across the netlify, node and vercel adapters.
 *
 * @see src/integrations/email/index.ts
 * @see project-docs/04-integrations/netlify-email/README.md
 * @example
 * const result = await sendEmail({
 *   template: 'contact-notification',
 *   to: 'owner@example.com',
 *   subject: 'New message',
 *   parameters: { name: 'Ada' },
 * })
 * if (!result.sent) logger.warn('notification skipped', { reason: result.reason })
 */
import { templates, type EmailTemplate } from 'virtual:astro-email/templates'

import {
  isProviderName,
  sendViaProvider,
  type ProviderConfig,
  type ProviderName,
} from '#integrations/email/providers'
import { renderTemplate, type TemplateParameters } from '#integrations/email/render'
import { logger } from '#utils/logger'

export type { EmailTemplate }

/** A request to send one templated email. */
export type SendEmailOptions = {
  template: EmailTemplate
  to: string
  subject: string
  parameters: TemplateParameters
  /** Overrides `EMAIL_FROM_ADDRESS`. Must be an address the provider allows. */
  from?: string | undefined
  cc?: string | undefined
  bcc?: string | undefined
  /** Where a reply should go, when that is not the sending address. */
  replyTo?: string | undefined
}

/** Why a send did not happen, when it did not. */
export type SendEmailFailure =
  | 'not-configured'
  | 'unknown-template'
  | 'provider-error'
  | 'network-error'

export type SendEmailResult = { sent: true } | { sent: false; reason: SendEmailFailure }

type EmailEnvironment = {
  provider: ProviderName
  from: string
  config: ProviderConfig
}

/**
 * Read an environment value, treating `.env.example` placeholders as absent.
 *
 * Matches how `#utils/env-config` handles `YOUR_SUPABASE_URL` and friends:
 * copying `.env.example` to `.env` must leave a feature off rather than
 * configured-but-broken. Without this, `EMAIL_PROVIDER_API_KEY=YOUR_...` counts
 * as configured and every send fails at the provider with a 401.
 */
function configuredValue(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('YOUR_')) return undefined
  return trimmed
}

/**
 * Strip CR/LF from a value destined for an email header.
 *
 * The contact form's subject reaches here unverified, and `sanitizeName` in
 * `#utils/input-sanitization` collapses runs of whitespace but leaves a lone
 * newline intact — so `Subject: ...\nBcc: victim@example.com` survives to the
 * provider call. Providers generally reject this, but the guarantee belongs
 * here rather than in three provider APIs we do not control.
 */
function headerSafe<T extends string | undefined>(value: T): T {
  return (value === undefined ? value : value.replace(/[\r\n]+/g, ' ').trim()) as T
}

/**
 * Where contact-form notifications go.
 *
 * Lives here rather than being read from `process.env` at the call site so the
 * feature has one configuration surface.
 *
 * @returns The configured address, or `null` when notifications are disabled.
 */
export function getNotificationAddress(): string | null {
  return configuredValue(process.env.EMAIL_TO_ADDRESS) ?? null
}

/**
 * Read email configuration from the runtime environment.
 *
 * `process.env` rather than `import.meta.env`: Astro inlines `import.meta.env`
 * during the build, which would bake the provider API key into the server
 * bundle. Reading at request time also lets the same build run against
 * different credentials per deploy context.
 *
 * @returns The configuration, or `null` when the project has no email set up -
 * a normal state in local development and in unconfigured forks.
 */
function readEnvironment(): EmailEnvironment | null {
  const provider = configuredValue(process.env.EMAIL_PROVIDER)
  const apiKey = configuredValue(process.env.EMAIL_PROVIDER_API_KEY)
  const from = configuredValue(process.env.EMAIL_FROM_ADDRESS)

  if (!isProviderName(provider) || !apiKey || !from) return null

  const mailgunDomain = configuredValue(process.env.EMAIL_MAILGUN_DOMAIN)

  // Mailgun cannot send without a domain, and its adapter can only report that
  // per-send. Failing the configuration check instead keeps `isEmailConfigured()`
  // honest, so callers do not take the send path on every submission just to
  // log an error.
  if (provider === 'mailgun' && !mailgunDomain) return null

  return {
    provider,
    from,
    config: {
      apiKey,
      mailgunDomain,
      mailgunRegion: configuredValue(process.env.EMAIL_MAILGUN_REGION),
    },
  }
}

/** True when a provider, API key and sender address are all configured. */
export function isEmailConfigured(): boolean {
  return readEnvironment() !== null
}

/**
 * Render a template and send it, reporting failure rather than throwing.
 *
 * @param options See {@link SendEmailOptions}.
 * @returns `{ sent: true }`, or `{ sent: false, reason }` describing what stopped it.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const environment = readEnvironment()

  if (!environment) {
    await logger.debug('Email not configured - skipping send', { template: options.template })
    return { sent: false, reason: 'not-configured' }
  }

  const html = templates[options.template]

  // `=== undefined`, not falsy: an empty template compiles to '' and is still a
  // real template, so only a genuinely missing one is an error.
  if (html === undefined) {
    // Reachable when a template directory is deleted but a call site is not,
    // since the generated types only refresh on `astro sync`.
    await logger.error('Email template not found', { template: options.template })
    return { sent: false, reason: 'unknown-template' }
  }

  try {
    const result = await sendViaProvider(
      environment.provider,
      {
        from: headerSafe(options.from ?? environment.from),
        to: headerSafe(options.to),
        cc: headerSafe(options.cc),
        bcc: headerSafe(options.bcc),
        replyTo: headerSafe(options.replyTo),
        subject: headerSafe(options.subject),
        html: renderTemplate(html, options.parameters),
      },
      environment.config
    )

    if (!result.ok) {
      await logger.error('Email provider rejected send', {
        template: options.template,
        provider: environment.provider,
        status: result.status,
        detail: result.detail,
      })
      return { sent: false, reason: 'provider-error' }
    }

    await logger.info('Email sent', {
      template: options.template,
      provider: environment.provider,
    })
    return { sent: true }
  } catch (error) {
    await logger.error('Email send failed', {
      template: options.template,
      provider: environment.provider,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return { sent: false, reason: 'network-error' }
  }
}
