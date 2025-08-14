import type { APIRoute } from 'astro'
import { Webhook } from 'svix'

import { createServerSupabaseClient } from '#libs/supabase-server'

const webhookSecret = import.meta.env.CLERK_WEBHOOK_SECRET

export const POST: APIRoute = async ({ request }) => {
  if (!webhookSecret) {
    console.error('CLERK_WEBHOOK_SECRET not configured')
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
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Get Supabase client with service role
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.error('Supabase client not configured')
    return new Response('Database not configured', { status: 500 })
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

      const userData = {
        clerk_id: id,
        email: primaryEmail?.email_address || email_addresses?.[0]?.email_address,
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
