import type { APIRoute } from 'astro'

import { getDatabase } from '#libs/database'

export const GET: APIRoute = async () => {
  try {
    // Use database abstraction layer
    const db = getDatabase()

    if (!db.isConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database not configured',
          error: 'No database provider is properly configured',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const providerName = db.getProviderName()

    // Test basic connection by attempting to get messages
    try {
      const messages = await db.getMessages({ limit: 1 })

      return new Response(
        JSON.stringify({
          success: true,
          message: `Database connection successful (${providerName})`,
          provider: providerName,
          timestamp: new Date().toISOString(),
          testResult: `Found ${messages.length} messages in test query`,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    } catch (queryError) {
      console.error('Database query error:', queryError)
      return new Response(
        JSON.stringify({
          success: false,
          message: `Database connection failed (${providerName})`,
          provider: providerName,
          error: queryError instanceof Error ? queryError.message : 'Unknown query error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = getDatabase()

    if (!db.isConfigured()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database not configured',
          error: 'No database provider is properly configured',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    const body = await request.json()
    const { action } = body
    const providerName = db.getProviderName()

    switch (action) {
      case 'test-query': {
        try {
          // Test database operations using abstraction layer
          const messages = await db.getMessages({ limit: 1 })

          return new Response(
            JSON.stringify({
              success: true,
              message: `Test query successful (${providerName})`,
              provider: providerName,
              testResult: `Retrieved ${messages.length} messages`,
              data: messages,
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
        } catch (testError) {
          return new Response(
            JSON.stringify({
              success: false,
              message: `Test query failed (${providerName})`,
              provider: providerName,
              error: testError instanceof Error ? testError.message : 'Unknown error',
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          )
        }
      }

      default:
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Unknown action',
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
    }
  } catch (error) {
    console.error('POST error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to process request',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
