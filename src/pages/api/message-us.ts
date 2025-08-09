import type { APIRoute } from 'astro'

import { insertMessage, isTursoConfigured } from '#libs/turso'
import type { MessageData } from '#libs/turso'

export const POST: APIRoute = async ({ request }) => {
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

    if (contentType?.includes('application/json')) {
      data = await request.json()
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      data = Object.fromEntries(formData.entries())
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
      ip_address: ip_address.substring(0, 45), // Limit to schema constraint
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
