import type { APIRoute } from 'astro'

import { supabase } from '#libs/supabase'

export const GET: APIRoute = async () => {
  try {
    // Test basic connection by checking auth
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error('Supabase connection error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to connect to Supabase',
          error: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Supabase connection successful',
        timestamp: new Date().toISOString(),
        sessionData: data ? 'Session data available' : 'No session data',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
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
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'test-query': {
        // Test a simple query (this will fail if no tables exist, which is expected)
        const { data: testData, error: testError } = await supabase
          .from('test_table')
          .select('*')
          .limit(1)

        return new Response(
          JSON.stringify({
            success: !testError,
            message: testError
              ? 'No test table found (expected for new setup)'
              : 'Test query successful',
            error: testError?.message,
            data: testData,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
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
