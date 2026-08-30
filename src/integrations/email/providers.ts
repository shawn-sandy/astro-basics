/**
 * Email provider adapters.
 *
 * Each adapter is a single REST call, so the message body and the API key go
 * straight from our function to the provider. The Netlify email integration
 * instead posts both to netlify-integration-emails.netlify.app, which renders
 * and sends on our behalf; keeping that hop out is one of the reasons for
 * owning this layer.
 *
 * Provider APIs are pinned by shape here, not by SDK. Verify request formats
 * against current provider documentation before the first production send.
 */

/** A message ready to hand to a provider. */
export type ProviderMessage = {
  from: string
  to: string
  subject: string
  html: string
  cc?: string | undefined
  bcc?: string | undefined
}

/** Configuration a provider needs, read from the environment at send time. */
export type ProviderConfig = {
  apiKey: string
  /** Mailgun only: the verified sending domain. */
  mailgunDomain?: string | undefined
  /** Mailgun only: `us` or `eu`. */
  mailgunRegion?: string | undefined
}

/** Providers this integration can send through. */
export type ProviderName = 'postmark' | 'sendgrid' | 'mailgun'

/** Outcome of a provider call. Adapters report failure, they do not throw. */
export type ProviderResult = { ok: true } | { ok: false; status: number; detail: string }

type Adapter = (message: ProviderMessage, config: ProviderConfig) => Promise<ProviderResult>

/** Build a result from a fetch Response, truncating provider error bodies. */
async function toResult(response: Response): Promise<ProviderResult> {
  if (response.ok) return { ok: true }
  const detail = await response.text().catch(() => '')
  return { ok: false, status: response.status, detail: detail.slice(0, 500) }
}

const postmark: Adapter = async (message, config) => {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      From: message.from,
      To: message.to,
      Cc: message.cc,
      Bcc: message.bcc,
      Subject: message.subject,
      HtmlBody: message.html,
    }),
  })
  return await toResult(response)
}

const sendgrid: Adapter = async (message, config) => {
  const personalization: Record<string, unknown> = { to: [{ email: message.to }] }
  if (message.cc) personalization.cc = [{ email: message.cc }]
  if (message.bcc) personalization.bcc = [{ email: message.bcc }]

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [personalization],
      from: { email: message.from },
      subject: message.subject,
      content: [{ type: 'text/html', value: message.html }],
    }),
  })
  return await toResult(response)
}

const mailgun: Adapter = async (message, config) => {
  if (!config.mailgunDomain) {
    return { ok: false, status: 0, detail: 'EMAIL_MAILGUN_DOMAIN is not set' }
  }

  const host = config.mailgunRegion === 'eu' ? 'api.eu.mailgun.net' : 'api.mailgun.net'
  const form = new URLSearchParams({
    from: message.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
  })
  if (message.cc) form.set('cc', message.cc)
  if (message.bcc) form.set('bcc', message.bcc)

  const response = await fetch(`https://${host}/v3/${config.mailgunDomain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`api:${config.apiKey}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })
  return await toResult(response)
}

const ADAPTERS: Record<ProviderName, Adapter> = { postmark, sendgrid, mailgun }

/** True when `value` names a provider this integration supports. */
export function isProviderName(value: string | undefined): value is ProviderName {
  return value === 'postmark' || value === 'sendgrid' || value === 'mailgun'
}

/** Send one message through the named provider. */
export async function sendViaProvider(
  provider: ProviderName,
  message: ProviderMessage,
  config: ProviderConfig
): Promise<ProviderResult> {
  return await ADAPTERS[provider](message, config)
}
