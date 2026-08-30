# Netlify Email Integration — Review & Adoption Plan

**Status:** Assessed and **not adopted**. Email was instead implemented as a
project-local Astro integration (`src/integrations/email/`), which resolves the
blocking findings below. See [§6](#6-outcome-implemented-as-an-astro-integration)
and the [Email guide](../../../src/content/docs/guide/integrations/email.mdx).
**Scope:** Contact form (`POST /api/message-us`) and signup (Clerk `user.created`)
**Reviewed against:** `@netlify/plugin-emails@1.1.1` (source read directly from the published
tarball, since <https://docs.netlify.com/extend/install-and-use/setup-guides/email-integration/>
is unreachable from the build sandbox)

---

## 1. What the integration actually is

The "Netlify Email Integration" is a **build plugin** (`@netlify/plugin-emails`) that you enable
from the Netlify UI under `app.netlify.com/integrations/{site}/emails`. It does three things:

1. On `onBuild` / `onDev`, it copies a prebuilt handler to
   `.netlify/functions-internal/emails/index.js` and adds `./emails/**` to that function's
   `included_files`, so your templates ship with the function.
2. That function exposes `POST /.netlify/functions/emails/<template-name>`, authenticated by a
   shared secret in the `netlify-emails-secret` header.
3. On each request it reads `emails/<template>/index.html` or `index.mjml` from disk, then makes
   **two outbound HTTPS calls to a Netlify-hosted service**, `netlify-integration-emails.netlify.app`:
   - `POST /.netlify/functions/render` — sends your template source + your parameters, gets HTML back
   - `POST /.netlify/functions/send` — sends your **provider API key**, the rendered HTML, and the
     recipient addresses; that service calls Mailgun/SendGrid/Postmark on your behalf

**Supported providers:** Mailgun, SendGrid, Postmark. (Resend is _not_ supported.)

### Architecture as it would sit in this repo

```text
Browser
  └─> POST /api/message-us              (Astro SSR fn, .netlify/v1/functions/ssr)
        ├─> db.insertMessage()          (existing — Turso/Supabase)
        └─> POST $URL/.netlify/functions/emails/contact-notification
              header: netlify-emails-secret
              └─> [emails fn, .netlify/functions-internal/emails]
                    ├─> POST netlify-integration-emails.netlify.app/.netlify/functions/render
                    └─> POST netlify-integration-emails.netlify.app/.netlify/functions/send
                          └─> Mailgun / SendGrid / Postmark ──> recipient
```

Note the shape: **one HTTP hop between two of our own functions, then two more hops to a
third-party renderer.** Four network round trips per email, inside the request that the user is
waiting on unless we make it non-blocking.

### Required configuration

| Variable                             | Required     | Notes                                                |
| ------------------------------------ | ------------ | ---------------------------------------------------- |
| `NETLIFY_EMAILS_PROVIDER`            | yes          | `mailgun` \| `sendgrid` \| `postmark`                |
| `NETLIFY_EMAILS_PROVIDER_API_KEY`    | yes          | Provider key — leaves our infra on every send        |
| `NETLIFY_EMAILS_SECRET`              | yes          | Shared secret for the `netlify-emails-secret` header |
| `NETLIFY_EMAILS_DIRECTORY`           | no           | Defaults to `./emails`                               |
| `NETLIFY_EMAILS_MAILGUN_DOMAIN`      | Mailgun only |                                                      |
| `NETLIFY_EMAILS_MAILGUN_HOST_REGION` | Mailgun only |                                                      |
| `SITE_ID`, `URL`, `CONTEXT`          | injected     | Provided by Netlify at build/runtime                 |

If any required variable is missing, `POST` returns **400** with a message naming exactly which
ones are absent, and `GET` returns a configuration-help page. It fails loudly, which is good.

### Template format

`emails/<route-name>/index.html` (or `index.mjml` for [MJML](https://mjml.io)). Variables use
Handlebars:

```html
<html>
  <body>
    <h1>Welcome, {{name}}</h1>
    <p>We hope you enjoy our super simple emails!</p>
  </body>
</html>
```

### Sending

```js
await fetch(`${process.env.URL}/.netlify/functions/emails/welcome`, {
  headers: { 'netlify-emails-secret': process.env.NETLIFY_EMAILS_SECRET },
  method: 'POST',
  body: JSON.stringify({
    from: 'no-reply@yourdomain.com',
    to: 'alexanderhamilton@test.com',
    cc: 'cc@test.com',
    bcc: 'bcc@test.com',
    subject: 'Welcome',
    parameters: { products: ['product1', 'product2'], name: 'Alexander' },
  }),
})
```

`from` and `to` are mandatory (400 if absent). `subject` defaults to `''`. `cc`, `bcc` and
`attachments` are optional passthroughs.

---

## 2. Review

### What it gets right

- **Templates are version-controlled** next to the code, reviewable in PRs. This is the headline
  benefit over editing templates in a provider dashboard.
- **MJML support** without adding an MJML build step of our own — the hosted renderer compiles it.
- **Provider-agnostic call site.** Switching Mailgun → Postmark is an env var change, no code change.
- **Good failure messages.** Missing config is reported by name rather than as a generic 500.
- **Local preview.** `netlify build && netlify dev`, then `http://localhost:8888/.netlify/functions/emails`
  lists templates and renders them.
- **Zero runtime dependencies for us** — no provider SDK in `package.json`.

### Concerns

**🔴 1. Deploy previews leak `NETLIFY_EMAILS_SECRET` into public HTML.**
This is the finding that most affects us. The handler enables the `GET` preview UI whenever
`CONTEXT` is `deploy-preview`, `branch-deploy`, or `dev`, and the preview page it returns embeds
the secret directly in a script tag:

```js
secret = ${JSON.stringify(process.env.NETLIFY_EMAILS_SECRET)}
url = ${JSON.stringify(process.env.URL)}
```

Netlify deploy previews are publicly accessible by default (password protection and SSO are
paid-plan features). Anyone with a PR preview URL can read the secret and, because env vars are
shared across contexts by default, use it to send mail through the **production** endpoint from
our domain. **Mitigation is mandatory, not optional:** scope `NETLIFY_EMAILS_SECRET` per deploy
context in Netlify's env settings so production has a distinct value, and/or password-protect
previews. Do not adopt this integration without doing that first.

**🟠 2. Message content and the provider API key transit a third-party service.**
Every send posts our `NETLIFY_EMAILS_PROVIDER_API_KEY`, the rendered HTML, and recipient addresses
to `netlify-integration-emails.netlify.app`. For contact-form messages that means user-submitted
content — potentially personal information — passes through infrastructure we neither control nor
have a data-processing agreement with. A direct provider SDK call keeps the key and the content
between us and the provider. This is a compliance question for the owner, not a technical blocker.

**🟠 3. Our current deploy scripts would silently ship no emails function.**
`deploy:prod` is `npm run build && netlify deploy --dir=dist --prod` — that runs `astro build`
directly, so Netlify's build pipeline never executes and `onBuild` never fires. No
`.netlify/functions-internal/emails` is produced. Adopting this requires moving to `netlify build`
(which does run plugins) or to git-triggered builds. Worth confirming the current scripts deploy
the SSR function correctly at all, independently of this work.

**🟡 4. Availability and support posture.** The plugin is at `1.1.1`, pins `@netlify/functions@^1.2.0`
and the legacy `Handler` signature, and declares `engines.node >= 16` while we're on `>= 22.12.0`.
It is a hard runtime dependency on a single Netlify-hosted app with no documented SLA; if
`netlify-integration-emails.netlify.app` is down, we send nothing, and there is no fallback path.

**🟡 5. It couples us to Netlify.** `astro.config.mjs` deliberately supports `node`, `vercel` and
`netlify` adapters. This integration works on exactly one of them, and email would silently stop
working on the others. A thin `#utils/email` abstraction (below) contains the blast radius.

**🟡 6. Four network hops in the request path.** Acceptable only if sends are fire-and-forget.
The contact form must not block on email delivery or become slower/flakier than it is today.

**🟢 7. Handlebars escaping.** `{{name}}` HTML-escapes by default; `{{{name}}}` does not. Since our
contact-form parameters are attacker-controlled, **templates must only ever use double braces.**
Worth an explicit note in the template README and a review checklist item.

### Compatibility with our stack — checked, no collision

`@astrojs/netlify@8` emits the SSR function to `.netlify/v1/functions/ssr/` (Functions v2). The
emails plugin writes to `.netlify/functions-internal/emails/`. Different directories, both bundled
by Netlify's build as internal functions, so the two coexist. The emails handler is v1-style, which
Netlify still supports.

### Verdict

**Viable, and worth adopting for the contact form** — the version-controlled templates and MJML
support are a real win, and there is no email capability in the repo today. Adopt it **only after**
scoping the secret per deploy context (concern 1) and fixing the deploy command (concern 3).

If the owner is uncomfortable with message content passing through a third party (concern 2), the
alternative is a direct provider SDK call from `src/utils/email.ts` with the same interface. The
integration design below is deliberately built so that swapping the transport is a one-file change.

---

## 3. Proposed integration

> **Superseded.** This section proposes wiring for the _Netlify_ integration and
> is kept as the record of what adopting it would have involved. The shipped
> implementation uses the Astro integration described in [§6](#6-outcome-implemented-as-an-astro-integration);
> for current usage see the [Email guide](../../../src/content/docs/guide/integrations/email.mdx).

### 3.1 Templates

```text
emails/
├── contact-notification/index.mjml   # to the site owner, on contact form submit
├── contact-confirmation/index.mjml   # auto-reply to the submitter
└── welcome/index.mjml                # to a new user, on Clerk user.created
```

`emails/contact-notification/index.mjml`:

```xml
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text mj-class="h1">New contact form message</mj-text>
        <mj-text><strong>From:</strong> {{name}} &lt;{{email}}&gt;</mj-text>
        <mj-text><strong>Subject:</strong> {{subject}}</mj-text>
        <mj-divider />
        <mj-text>{{message}}</mj-text>
        <mj-divider />
        <mj-text font-size="12px" color="#666">
          Message ID {{messageId}} · received {{receivedAt}}
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

Only double braces, per concern 7. Values still go through `sanitizeMessageData` first.

### 3.2 A transport-agnostic helper: `src/utils/email.ts`

This is the seam that isolates concerns 5 and 2 — every caller goes through it, so replacing the
Netlify transport with a provider SDK later touches one file.

```ts
/**
 * Email delivery via the Netlify Email Integration.
 *
 * Sends are best-effort: this module never throws and never rejects. Callers are
 * request handlers whose primary work (persisting a message, syncing a user) has
 * already succeeded, and a mail failure must not turn that into an error response.
 *
 * @see project-docs/04-integrations/netlify-email/README.md
 */
import { logger } from '#utils/logger'

export type EmailTemplate = 'contact-notification' | 'contact-confirmation' | 'welcome'

export type SendEmailOptions = {
  template: EmailTemplate
  to: string
  subject: string
  parameters: Record<string, string | string[]>
  from?: string | undefined
  cc?: string | undefined
  bcc?: string | undefined
}

export type SendEmailResult = { sent: true } | { sent: false; reason: string }

/**
 * Runtime-only env reads.
 *
 * `URL` is the per-deploy address and is not knowable at build time, so it must come
 * from `process.env` rather than `import.meta.env` (which Astro inlines during the
 * build). Reading the secret at runtime also keeps it out of the SSR bundle.
 */
const emailEnv = () => ({
  siteUrl: process.env.URL,
  secret: process.env.NETLIFY_EMAILS_SECRET,
  from: process.env.EMAIL_FROM_ADDRESS,
})

/** True when every variable required to send is present. */
export function isEmailConfigured(): boolean {
  const { siteUrl, secret, from } = emailEnv()
  return Boolean(siteUrl && secret && from)
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { siteUrl, secret, from } = emailEnv()

  if (!siteUrl || !secret || !from) {
    // Unconfigured is a normal state in local dev and in the node/vercel adapters.
    // Log once at debug level rather than treating it as an error.
    await logger.debug('Email not configured - skipping send', { template: options.template })
    return { sent: false, reason: 'not-configured' }
  }

  try {
    const response = await fetch(`${siteUrl}/.netlify/functions/emails/${options.template}`, {
      method: 'POST',
      headers: {
        'netlify-emails-secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from ?? from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        parameters: options.parameters,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      await logger.error('Email send failed', {
        template: options.template,
        status: response.status,
        body: body.slice(0, 500),
      })
      return { sent: false, reason: `status-${response.status}` }
    }

    await logger.info('Email sent', { template: options.template })
    return { sent: true }
  } catch (error) {
    await logger.error('Email send threw', {
      template: options.template,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return { sent: false, reason: 'network-error' }
  }
}
```

### 3.3 Contact form — `src/pages/api/message-us.ts`

Insert after the successful `db.insertMessage(messageData)` and before the 200 response. The send
is awaited but its result is ignored for the response, so a mail outage degrades to "message saved,
owner not notified" rather than a 500 shown to the user.

```ts
const messageId = await db.insertMessage(messageData)

// Best-effort notification. sendEmail never throws; a failure is logged, not surfaced.
if (isEmailConfigured()) {
  await sendEmail({
    template: 'contact-notification',
    to: CONTACT_INFO.notificationAddress,
    subject: `New contact message: ${sanitizedData.subject}`,
    parameters: {
      name: sanitizedData.name,
      email: sanitizedData.email,
      subject: sanitizedData.subject,
      message: sanitizedData.message,
      messageId: String(messageId),
      receivedAt: new Date().toISOString(),
    },
  })
}
```

**On the auto-reply to the submitter.** `contact-confirmation` mails an address we have not
verified, which makes the endpoint a reflector: someone can submit the form with a victim's address
and cause our domain to mail them. The existing per-IP rate limiter on `POST /api/message-us`
(`src/middleware.ts`) and the honeypot field blunt this, but do not remove it. Recommendation:
**ship the owner notification first and treat the auto-reply as a separate decision.** If we do
ship it, keep the template free of submitter-controlled content beyond `{{name}}`, so a reflected
message cannot carry an attacker's payload.

`CONTACT_INFO` in `src/utils/site-config.ts` gains the destination:

```ts
export const CONTACT_INFO = {
  name: 'Email',
  url: '/success',
  isNetlify: false,
  notificationAddress: 'hello@yourdomain.com',
}
```

### 3.4 Signup — `src/pages/api/webhooks/clerk.ts`

Clerk already sends its own verification and magic-link emails; this is a product welcome on top of
those. The hook point is the `user.created` case, after the Supabase upsert succeeds and `validEmail`
is in hand.

```ts
// After the users upsert and default-preferences creation succeed.
await sendEmail({
  template: 'welcome',
  to: validEmail,
  subject: `Welcome to ${SITE_TITLE}`,
  parameters: {
    name: `${first_name || ''} ${last_name || ''}`.trim() || username || 'there',
  },
})
```

**Critical:** the webhook must keep returning 2xx regardless of the mail outcome. Clerk retries
non-2xx responses, and a mail failure that produced a 500 would make Clerk redeliver `user.created`
— re-running the upsert and sending the welcome email again on the retry. `sendEmail` returning a
result instead of throwing is what makes this safe.

**Duplicate-send caveat:** Clerk can legitimately redeliver `user.created`. The upsert is idempotent;
the email is not. If duplicate welcome emails matter, gate the send on the upsert having actually
inserted rather than updated, or record a `welcome_email_sent_at` on the user row.

---

## 4. Adoption plan

> **Superseded**, as above — in particular the `NETLIFY_EMAILS_*` variables below
> are _not_ the ones the project uses. See `.env.example` for the live set.

### Phase 0 — prerequisites (blocking, owner action)

1. Choose a provider (Mailgun / SendGrid / Postmark), verify the sending domain, add SPF/DKIM.
2. Enable the integration at `app.netlify.com/integrations/{site}/emails`.
3. **Set a production-only `NETLIFY_EMAILS_SECRET`** using Netlify's per-context env values, so
   deploy previews cannot expose the production secret (concern 1).
4. Fix `deploy:preview` / `deploy:prod` to run `netlify build` so build plugins execute (concern 3),
   and confirm the SSR function still deploys.

### Phase 1 — plumbing

1. Add `src/utils/email.ts` and unit tests (mock `fetch`: success, non-2xx, throw, unconfigured).
2. Add `emails/` templates + an `emails/README.md` noting the double-brace rule.
3. Add the new variables to `.env.example`, and email accessors to `src/utils/env-config.ts`
   alongside the existing Clerk/Supabase/Axiom ones.

### Phase 2 — contact form

1. Wire `contact-notification` into `POST /api/message-us`. Verify on a deploy preview.
2. Decide on `contact-confirmation` separately (§3.3).

### Phase 3 — signup

1. Wire `welcome` into the Clerk `user.created` handler, with the duplicate-send guard.

### Phase 4 — documentation

1. Write the Starlight guide page at `src/content/docs/guide/integrations/netlify-email.mdx` and
   add it to the Integrations sidebar in `astro.config.mjs`.

### Testing

- **Unit (Vitest):** `sendEmail` behaviour for each branch, with `fetch` mocked. No live sends.
- **Local:** `netlify build && netlify dev`, then `http://localhost:8888/.netlify/functions/emails`
  to preview templates and trigger a real send.
- **E2E (Playwright):** the existing contact-form specs must still pass with email unconfigured —
  that is the regression that matters, since it proves a mail outage cannot break submission.

### Env vars to add to `.env.example`

```env
# Netlify Email Integration (set in the Netlify UI for deployed environments)
# Provider: mailgun | sendgrid | postmark
NETLIFY_EMAILS_PROVIDER=YOUR_EMAIL_PROVIDER
NETLIFY_EMAILS_PROVIDER_API_KEY=YOUR_EMAIL_PROVIDER_API_KEY
# Shared secret for the netlify-emails-secret header.
# IMPORTANT: scope this per deploy context - deploy previews expose it in the preview UI.
NETLIFY_EMAILS_SECRET=YOUR_EMAILS_SECRET
# Optional - defaults to ./emails
# NETLIFY_EMAILS_DIRECTORY=./emails
# Mailgun only
# NETLIFY_EMAILS_MAILGUN_DOMAIN=mg.yourdomain.com
# NETLIFY_EMAILS_MAILGUN_HOST_REGION=us
# Verified sender address used as the default "from"
EMAIL_FROM_ADDRESS=no-reply@yourdomain.com
```

---

## 5. Alternative, for comparison

|                                   | Netlify Email Integration     | Direct provider SDK            |
| --------------------------------- | ----------------------------- | ------------------------------ |
| Templates in git                  | ✅                            | ✅ (needs own renderer)        |
| MJML                              | ✅ hosted                     | ➖ add `mjml` dep + build step |
| Provider key stays with us        | ❌ posted to Netlify service  | ✅                             |
| Message content stays with us     | ❌                            | ✅                             |
| Works on node/vercel adapters     | ❌ Netlify only               | ✅                             |
| Network hops per send             | 4                             | 1                              |
| Setup effort                      | Low (UI + env vars)           | Medium                         |
| Secret exposed on deploy previews | ⚠️ yes, unless context-scoped | ✅ n/a                         |

The `src/utils/email.ts` interface in §3.2 is identical under either choice, so this decision can be
revisited later without touching the call sites.

---

## 6. Outcome: implemented as an Astro integration

The comparison in §5 was settled by building the right-hand column as an Astro
integration rather than a standalone module. Astro's `astro:config:setup` and
`astro:config:done` hooks cover everything the Netlify build plugin does, and
doing the work inside the Astro build turns out to answer the blocking findings
directly.

### How each finding is resolved

| Finding                                         | Resolution                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 1. Deploy previews leak the secret           | No hosted preview and no shared secret. The preview route is injected only when `command === 'dev'`, so it cannot exist in any deployed context.                          |
| 🟠 2. Content and API key transit a third party | Adapters call the provider directly. Nothing leaves our function except the provider request itself.                                                                      |
| 🟠 3. Deploy scripts skip the build plugin      | Runs during `astro build`, so it does not depend on `netlify build` executing Netlify's plugin pipeline. (The `deploy:*` scripts should still be reviewed independently.) |
| 🟡 4. Availability of a single hosted service   | No runtime dependency beyond the provider.                                                                                                                                |
| 🟡 5. Netlify lock-in                           | Templates are inlined into the server bundle, so the same build works on the `netlify`, `node` and `vercel` adapters.                                                     |
| 🟡 6. Four network hops                         | One: our function to the provider.                                                                                                                                        |
| 🟢 7. Handlebars escaping footgun               | Removed rather than documented. The renderer implements only `{{ name }}`, always escaped; `{{{ raw }}}` has no meaning and does not interpolate.                         |

### What was verified

- `astro sync` generates `EmailTemplate = "contact-notification" | "welcome"`
  from the template directories, so call sites type-check against templates
  that actually exist.
- `npm run build` inlines both templates into
  `.netlify/v1/functions/ssr/.netlify/build/chunks/email_*.mjs`, and that chunk
  contains **no** `readFileSync` or `node:fs` reference. No `emails/` directory
  is emitted into the build output, and the preview route is absent from it.
- 22 unit tests pass, covering the escaping guarantees and the never-throws
  contract on every failure path.
- Provider request shapes were checked against the official SDKs (`postmark`,
  `@sendgrid/mail` with `@sendgrid/helpers`, `mailgun.js`): endpoints, auth
  headers, body field names, Mailgun's `api` basic-auth username and its EU
  host all match the adapters.
- `npm run type-check` reports 124 errors against 130 on the base branch. This
  work adds none; restoring the `.astro/types.d.ts` entry to tsconfig `include`
  fixes six pre-existing ones. Note that type-check was already failing before
  this change.

### Cost of owning it

Roughly 500 lines of integration and runtime code, plus tests, that are now
ours to maintain: template compilation, escaping, and one adapter per provider.
In exchange we drop a hosted dependency, a shared secret, a third-party data
hop, and the Netlify-only constraint. MJML support is optional and pulled in
lazily, so projects using HTML templates add no dependency at all.

The transport boundary in `src/integrations/email/providers.ts` is narrow, so
switching to a provider SDK later — or back to the Netlify integration — is a
single-file change that leaves every call site untouched.
