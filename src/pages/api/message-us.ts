import { isIP } from 'node:net'

import type { APIRoute } from 'astro'

import { insertMessage, isTursoConfigured } from '#libs/turso'
import type { MessageData } from '#libs/turso'
import {
  validateCsrfToken,
  extractCsrfTokenFromForm,
  extractCsrfTokenFromJson,
  parseCsrfTokenFromCookie,
  CSRF_CONFIG,
} from '#utils/csrf'

export const POST: APIRoute = async ({ request, cookies }) => {
  // Check if Turso is configured
  if (!isTursoConfigured()) {
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

    // Validate required fields
    const { name, email, subject, message } = data

    if (!name || !email || !message) {
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

    // Validate field types and lengths
    if (typeof name !== 'string' || name.length > 255) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Name must be a string with maximum 255 characters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (typeof email !== 'string' || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide a valid email address',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (subject && (typeof subject !== 'string' || subject.length > 500)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Subject must be a string with maximum 500 characters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (typeof message !== 'string' || message.length > 5000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message must be a string with maximum 5000 characters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get client IP and user agent
    const ip_address =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const user_agent = request.headers.get('user-agent') || undefined

    // Prepare message data
    const messageData: MessageData = {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      subject: subject ? String(subject).trim() : undefined,
      message: String(message).trim(),
      ip_address: isIP(ip_address) && ip_address.length <= 45 ? ip_address : 'unknown', // Validate IP address
      user_agent: user_agent?.substring(0, 500), // Limit to schema constraint
    }

    // Insert message into database
    const messageId = await insertMessage(messageData)

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
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Contact API is running',
      configured: isTursoConfigured(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
