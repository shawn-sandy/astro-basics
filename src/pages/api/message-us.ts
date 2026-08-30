import type { APIRoute } from 'astro'

import { getDatabase } from '#libs/database'
import type { MessageData } from '#libs/database-types'
import {
  validateCsrfToken,
  extractCsrfTokenFromForm,
  extractCsrfTokenFromJson,
  parseCsrfTokenFromCookie,
  CSRF_CONFIG,
} from '#utils/csrf'
import { getNotificationAddress, sendEmail } from '#utils/email'
import { sanitizeMessageData } from '#utils/input-sanitization'
import { extractClientIP } from '#utils/ip-validation'

export const POST: APIRoute = async ({ request, cookies }) => {
  let db
  try {
    db = getDatabase()
    if (!db.isConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database is not configured. Please contact the administrator.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (error) {
    console.error('Database initialization error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Database service unavailable. Please contact the administrator.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Parse form data
    const contentType = request.headers.get('content-type')
    let data: Record<string, unknown>
    let csrfToken: string | undefined

    if (contentType?.includes('application/json')) {
      data = await request.json()
      csrfToken = extractCsrfTokenFromJson(data)
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries())
      csrfToken = extractCsrfTokenFromForm(formData)
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid content type',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // CSRF Token Validation
    const csrfCookieValue = cookies.get(CSRF_CONFIG.COOKIE_NAME)?.value
    const csrfTokenResult = parseCsrfTokenFromCookie(csrfCookieValue)

    if (!csrfTokenResult.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CSRF validation failed',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const expectedToken = csrfTokenResult.value?.token
    const expiresAt = csrfTokenResult.value?.expiresAt

    const validationResult = validateCsrfToken(csrfToken, expectedToken, expiresAt)

    if (!validationResult.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CSRF validation failed',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!validationResult.value.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `CSRF validation failed: ${validationResult.value.reason || 'Invalid token'}`,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Sanitize and validate message data
    // This removes dangerous characters, normalizes input, and detects suspicious content
    let sanitizedData
    try {
      sanitizedData = sanitizeMessageData(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid input data'

      // Handle different types of validation errors
      if (errorMessage.includes('Suspicious content detected')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Message contains prohibited content',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (errorMessage.includes('Invalid input types')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Name, email, and message are required fields',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      if (errorMessage.includes('Required fields cannot be empty')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Name, email, and message cannot be empty',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      // Generic validation error
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input data. Please check your submission.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get client IP and user agent
    const ip_address = extractClientIP(request)
    const user_agent = request.headers.get('user-agent') || undefined

    // Prepare message data using sanitized inputs
    const messageData: MessageData = {
      name: sanitizedData.name,
      email: sanitizedData.email,
      subject: sanitizedData.subject,
      message: sanitizedData.message,
      ip_address, // Now properly normalized and validated
      user_agent: user_agent?.substring(0, 500), // Limit to schema constraint
    }

    // Insert message into database
    const messageId = await db.insertMessage(messageData)

    // Notify the site owner. Best-effort by design: the message is already
    // persisted, so a mail outage must not turn a successful submission into an
    // error for the sender. `sendEmail` reports failure instead of throwing, and
    // the provider call is bounded by a timeout so a hung provider cannot push
    // this handler past the platform's function limit.
    const notificationAddress = getNotificationAddress()
    if (notificationAddress) {
      // `subject` is optional on MessageData, so give it a stand-in rather than
      // letting "undefined" reach the subject line of a real email.
      const subject = sanitizedData.subject || '(no subject)'
      await sendEmail({
        template: 'contact-notification',
        to: notificationAddress,
        // The submitter's address is unverified, so it must not be the sender.
        // As Reply-To it makes the notification answerable without letting the
        // form choose who our domain sends as.
        replyTo: sanitizedData.email,
        subject: `New contact message: ${subject}`,
        parameters: {
          name: sanitizedData.name,
          email: sanitizedData.email,
          subject,
          message: sanitizedData.message,
          messageId: String(messageId),
          receivedAt: new Date().toISOString(),
        },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been sent successfully!',
        id: messageId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Contact form submission error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while sending your message. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// Optional: Add GET endpoint to check API status
export const GET: APIRoute = async () => {
  let isConfigured = false
  let providerName = 'none'

  try {
    const db = getDatabase()
    isConfigured = db.isConfigured()
    providerName = db.getProviderName()
  } catch (error) {
    console.error('Database check error:', error)
  }

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Contact API is running',
      configured: isConfigured,
      provider: providerName,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
