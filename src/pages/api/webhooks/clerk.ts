import type { APIRoute } from 'astro'
import { Webhook } from 'svix'

import { getSupabaseServiceRole, isSupabaseConfigured } from '#libs/supabase-native'
import { logger } from '#utils/logger'

const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET

export const POST: APIRoute = async ({ request }) => {
  logger.debug('Clerk webhook received', { endpoint: '/api/webhooks/clerk' })

  if (!webhookSecret) {
    logger.error('Clerk webhook secret not configured', { endpoint: '/api/webhooks/clerk' })
    return new Response('Webhook secret not configured', { status: 500 })
  }

  // Get webhook headers
  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing webhook headers', { status: 400 })
  }

  // Verify webhook signature
  const payload = await request.text()
  const wh = new Webhook(webhookSecret)

  interface WebhookEvent {
    type: string
    data: {
      id: string
      email_addresses?: Array<{ id: string; email_address: string }>
      primary_email_address_id?: string
      username?: string
      first_name?: string
      last_name?: string
      image_url?: string
      public_metadata?: Record<string, unknown>
      last_sign_in_at?: number
      created_at?: number
      user_id?: string
    }
  }

  let evt: WebhookEvent
  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    logger.error('Clerk webhook verification failed', {
      endpoint: '/api/webhooks/clerk',
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return new Response('Invalid signature', { status: 400 })
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured - skipping user sync', { endpoint: '/api/webhooks/clerk' })
    return new Response('Webhook received but Supabase not configured', { status: 200 })
  }

  // Use service role client for webhook operations
  const supabase = getSupabaseServiceRole()

  if (!supabase) {
    console.error('Failed to get Supabase service role client')
    return new Response('Supabase service role not available', { status: 500 })
  }

  // Handle different event types
  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const {
        id,
        email_addresses,
        username,
        first_name,
        last_name,
        image_url,
        public_metadata,
        last_sign_in_at,
      } = evt.data

      const primaryEmail = email_addresses?.find(
        email => email.id === evt.data.primary_email_address_id
      )

      // Validate that we have at least one valid email address
      const validEmail =
        primaryEmail?.email_address ||
        (email_addresses && email_addresses.length > 0 && email_addresses[0]?.email_address)

      if (!validEmail) {
        console.error('User sync failed - no valid email address found for user:', id)
        return new Response(
          JSON.stringify({
            error: 'No valid email address found',
            message: 'User sync requires at least one email address',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const userData = {
        clerk_id: id,
        email: validEmail,
        username,
        full_name: `${first_name || ''} ${last_name || ''}`.trim() || null,
        avatar_url: image_url,
        metadata: public_metadata || {},
        last_sign_in_at: last_sign_in_at ? new Date(last_sign_in_at).toISOString() : null,
      }

      const { error } = await supabase.from('users').upsert(userData, {
        onConflict: 'clerk_id',
        ignoreDuplicates: false,
      })

      if (error) {
        console.error('Failed to sync user:', error)
        return new Response(`Failed to sync user: ${error.message}`, { status: 500 })
      }

      console.log(`User ${evt.type === 'user.created' ? 'created' : 'updated'}: ${id}`)
      break
    }

    case 'user.deleted': {
      const { error } = await supabase.from('users').delete().eq('clerk_id', evt.data.id)

      if (error) {
        console.error('Failed to delete user:', error)
        return new Response(`Failed to delete user: ${error.message}`, { status: 500 })
      }

      console.log(`User deleted: ${evt.data.id}`)
      break
    }

    case 'session.created': {
      // Update last sign in time
      const { error } = await supabase
        .from('users')
        .update({
          last_sign_in_at: new Date(evt.data.created_at).toISOString(),
        })
        .eq('clerk_id', evt.data.user_id)

      if (error) {
        console.error('Failed to update last sign in:', error)
      }
      break
    }

    default:
      console.log(`Unhandled webhook event type: ${evt.type}`)
  }

  return new Response('Webhook processed', { status: 200 })
}
