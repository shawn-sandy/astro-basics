import type { APIRoute } from 'astro'

import {
  validateCsrfToken,
  extractCsrfTokenFromForm,
  extractCsrfTokenFromJson,
  parseCsrfTokenFromCookie,
  CSRF_CONFIG,
} from '#utils/csrf'
import { getNotificationAddress, isEmailConfigured, sendEmail } from '#utils/email'
import { sanitizeMessageData } from '#utils/input-sanitization'

/**
 * Contact form submission.
 *
 * Submissions are not stored - the notification email is the only record of
 * each one, so the endpoint refuses work it cannot deliver and reports a failed
 * send as an error rather than acknowledging it.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const notificationAddress = getNotificationAddress()
  if (!notificationAddress || !isEmailConfigured()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'The contact form is not configured. Please contact the administrator.',
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

    // `subject` is optional, so give it a stand-in rather than letting
    // "undefined" reach the subject line of a real email.
    const subject = sanitizedData.subject || '(no subject)'

    // Deliver to the site owner. `sendEmail` reports failure instead of
    // throwing, and the provider call is bounded by a timeout so a hung
    // provider cannot push this handler past the platform's function limit.
    const delivery = await sendEmail({
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
        receivedAt: new Date().toISOString(),
      },
    })

    // Nothing else records the submission, so an undelivered message is lost
    // and the sender must be told to retry.
    if (!delivery.sent) {
      console.error('Contact form notification failed:', delivery.reason)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'An error occurred while sending your message. Please try again later.',
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your message has been sent successfully!',
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
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Contact API is running',
      configured: isEmailConfigured() && getNotificationAddress() !== null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
