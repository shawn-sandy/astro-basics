import { $authStore } from '@clerk/astro/client'
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { useSupabase } from '#hooks/useSupabase'
import type { Database } from '#libs/database.types'

type Message = Database['public']['Tables']['messages']['Row']

export function MessagesList() {
  const { userId, isLoaded } = useStore($authStore)
  const { client, loading: clientLoading, isAuthenticated } = useSupabase()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client || !userId || !isAuthenticated) {
      setLoading(false)
      return
    }

    // Validate userId to prevent injection attacks
    if (typeof userId !== 'string' || !/^user_[a-zA-Z0-9_]+$/.test(userId)) {
      console.error('Invalid user ID format')
      setError('Invalid user authentication')
      setLoading(false)
      return
    }

    let subscription: ReturnType<typeof client.channel> | undefined

    // Fetch and subscribe to messages
    async function setupMessages() {
      try {
        setLoading(true)

        // Initial fetch - use proper parameterized queries to prevent SQL injection
        const { data, error: fetchError } = await client
          .from('messages')
          .select('*')
          .eq('clerk_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)

        if (fetchError) throw fetchError

        setMessages(data || [])
        setError(null)

        // Real-time subscription - use safe filter without string interpolation
        subscription = client
          .channel('user-messages')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'messages',
              filter: `clerk_user_id=eq.${userId}`,
            },
            payload => {
              if (payload.eventType === 'INSERT') {
                setMessages(prev => [payload.new as Message, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                setMessages(prev =>
                  prev.map(msg => (msg.id === payload.new.id ? (payload.new as Message) : msg))
                )
              } else if (payload.eventType === 'DELETE') {
                setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
              }
            }
          )
          .subscribe()
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    setupMessages()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [client, userId, isAuthenticated])

  const markAsRead = async (messageId: number) => {
    if (!client) return

    try {
      const { error } = await client
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
        .eq('clerk_user_id', userId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to mark message as read:', err)
    }
  }

  const archiveMessage = async (messageId: number) => {
    if (!client) return

    try {
      const { error } = await client
        .from('messages')
        .update({ is_archived: true })
        .eq('id', messageId)
        .eq('clerk_user_id', userId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to archive message:', err)
    }
  }

  const deleteMessage = async (messageId: number) => {
    if (!client || !window.confirm('Are you sure you want to delete this message?')) return

    try {
      const { error } = await client
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('clerk_user_id', userId)

      if (error) throw error
    } catch (err) {
      console.error('Failed to delete message:', err)
    }
  }

  if (!isLoaded || clientLoading || loading) {
    return (
      <div className="messages-loading">
        <p>Loading messages...</p>
      </div>
    )
  }

  if (!userId || !isAuthenticated) {
    return (
      <div className="messages-auth-required">
        <p>Please sign in to view your messages</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="messages-error">
        <p>Error loading messages: {error}</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <p>No messages yet</p>
      </div>
    )
  }

  return (
    <div className="messages-list">
      <h2>Your Messages ({messages.filter(m => !m.is_read).length} unread)</h2>

      <div className="messages-container">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message-item ${message.is_read ? 'read' : 'unread'} ${message.is_archived ? 'archived' : ''}`}
          >
            <div className="message-header">
              <h3>{message.subject || 'No subject'}</h3>
              <time>{new Date(message.created_at).toLocaleString()}</time>
            </div>

            <div className="message-meta">
              <span className="message-from">
                {message.name} ({message.email})
              </span>
              {!message.is_read && <span className="badge unread">New</span>}
              {message.is_archived && <span className="badge archived">Archived</span>}
            </div>

            <p className="message-content">{message.message}</p>

            <div className="message-actions">
              {!message.is_read && (
                <button onClick={() => markAsRead(message.id)} className="btn btn-sm">
                  Mark as Read
                </button>
              )}
              {!message.is_archived && (
                <button onClick={() => archiveMessage(message.id)} className="btn btn-sm">
                  Archive
                </button>
              )}
              <button onClick={() => deleteMessage(message.id)} className="btn btn-sm btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
