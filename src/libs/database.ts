/**
 * Simple database abstraction layer for astro-basics
 * Enables easy switching between Turso and Supabase
 */

import type {
  Database,
  DatabaseProvider,
  ProviderDetectionResult,
  Message,
  MessageData,
  MessageQueryOptions,
} from './database-types'
import { isSupabaseConfigured } from './supabase'
import { getSupabaseServiceRole } from './supabase-native'
import {
  isTursoConfigured,
  insertMessage as tursoInsertMessage,
  getMessages as tursoGetMessages,
  getMessageById as tursoGetMessageById,
  markMessageAsRead as tursoMarkMessageAsRead,
  archiveMessage as tursoArchiveMessage,
  type MessageRow as TursoMessageRow,
} from './turso'

/**
 * Turso database provider implementation
 */
class TursoDatabase implements Database {
  getProviderName(): string {
    return 'turso'
  }

  isConfigured(): boolean {
    return isTursoConfigured()
  }

  async insertMessage(data: MessageData): Promise<number> {
    return await tursoInsertMessage(data)
  }

  async getMessages(options?: MessageQueryOptions): Promise<Message[]> {
    const tursoMessages = await tursoGetMessages(options)
    // Convert TursoMessageRow to unified Message type
    return tursoMessages.map(this.convertTursoMessage)
  }

  async getMessageById(id: number): Promise<Message | null> {
    const tursoMessage = await tursoGetMessageById(id)
    return tursoMessage ? this.convertTursoMessage(tursoMessage) : null
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    return await tursoMarkMessageAsRead(id)
  }

  async archiveMessage(id: number): Promise<boolean> {
    return await tursoArchiveMessage(id)
  }

  private convertTursoMessage(tursoMessage: TursoMessageRow): Message {
    return {
      id: tursoMessage.id,
      name: tursoMessage.name,
      email: tursoMessage.email,
      subject: tursoMessage.subject || null,
      message: tursoMessage.message,
      ip_address: tursoMessage.ip_address || null,
      user_agent: tursoMessage.user_agent || null,
      is_read: tursoMessage.is_read,
      is_archived: tursoMessage.is_archived,
      created_at: tursoMessage.created_at,
      updated_at: tursoMessage.updated_at,
    }
  }
}

/**
 * Supabase database provider implementation
 * Uses service role client for server-side operations
 */
class SupabaseDatabase implements Database {
  getProviderName(): string {
    return 'supabase'
  }

  isConfigured(): boolean {
    return isSupabaseConfigured()
  }

  async insertMessage(data: MessageData): Promise<number> {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase service role not configured')
    }

    const insertData = {
      name: data.name,
      email: data.email,
      subject: data.subject || null,
      message: data.message,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      is_read: false,
      is_archived: false,
    }

    const { data: result, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw new Error(`Failed to insert message: ${error.message}`)
    }

    if (!result?.id) {
      throw new Error('Failed to get inserted message ID')
    }

    return result.id
  }

  async getMessages(options?: MessageQueryOptions): Promise<Message[]> {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase service role not configured')
    }

    let query = supabase.from('messages').select('*')

    // Apply filters
    if (options?.is_read !== undefined) {
      query = query.eq('is_read', options.is_read)
    }

    if (options?.is_archived !== undefined) {
      query = query.eq('is_archived', options.is_archived)
    }

    // Order by created_at descending (like Turso implementation)
    query = query.order('created_at', { ascending: false })

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit)

      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1)
      }
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Supabase query error:', error)
      throw new Error(`Failed to retrieve messages: ${error.message}`)
    }

    return (messages || []).map(this.convertSupabaseMessage)
  }

  async getMessageById(id: number): Promise<Message | null> {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase service role not configured')
    }

    const { data: message, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      console.error('Supabase query error:', error)
      throw new Error(`Failed to retrieve message: ${error.message}`)
    }

    return message ? this.convertSupabaseMessage(message) : null
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase service role not configured')
    }

    const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id)

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error(`Failed to mark message as read: ${error.message}`)
    }

    return true
  }

  async archiveMessage(id: number): Promise<boolean> {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      throw new Error('Supabase service role not configured')
    }

    const { error } = await supabase.from('messages').update({ is_archived: true }).eq('id', id)

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error(`Failed to archive message: ${error.message}`)
    }

    return true
  }

  private convertSupabaseMessage(supabaseMessage: Record<string, unknown>): Message {
    return {
      id: supabaseMessage.id as number,
      name: supabaseMessage.name as string,
      email: supabaseMessage.email as string,
      subject: (supabaseMessage.subject as string) || null,
      message: supabaseMessage.message as string,
      ip_address: (supabaseMessage.ip_address as string) || null,
      user_agent: (supabaseMessage.user_agent as string) || null,
      is_read: supabaseMessage.is_read as boolean,
      is_archived: supabaseMessage.is_archived as boolean,
      created_at: supabaseMessage.created_at as string,
      updated_at: supabaseMessage.updated_at as string,
    }
  }
}

/**
 * Detect available and configured database providers
 */
export function detectDatabaseProviders(): ProviderDetectionResult {
  const available: string[] = []
  const configured: string[] = []

  // Check Turso
  if (isTursoConfigured()) {
    available.push('turso')
    configured.push('turso')
  }

  // Check Supabase
  if (isSupabaseConfigured()) {
    available.push('supabase')
    configured.push('supabase')
  }

  // Determine recommended provider
  let recommended: DatabaseProvider | null = null

  // Check for explicit provider preference
  const explicitProvider = import.meta.env.DATABASE_PROVIDER as DatabaseProvider
  if (explicitProvider && (explicitProvider === 'turso' || explicitProvider === 'supabase')) {
    if (configured.includes(explicitProvider)) {
      recommended = explicitProvider
    }
  }

  // If no explicit choice, prefer Supabase if available, then Turso
  if (!recommended) {
    if (configured.includes('supabase')) {
      recommended = 'supabase'
    } else if (configured.includes('turso')) {
      recommended = 'turso'
    }
  }

  return {
    provider: recommended || 'auto',
    available,
    configured,
    recommended,
  }
}

/**
 * Get the active database instance
 * This is the main entry point for all database operations
 */
export function getDatabase(): Database {
  const detection = detectDatabaseProviders()

  if (!detection.recommended) {
    throw new Error(
      'No database providers configured. Please configure either Turso or Supabase in your environment variables.'
    )
  }

  switch (detection.recommended) {
    case 'turso':
      return new TursoDatabase()

    case 'supabase':
      return new SupabaseDatabase()

    case 'auto':
      throw new Error('Auto provider should have resolved to a specific provider during detection')

    default:
      // This should never happen with proper TypeScript typing, but provides safety
      throw new Error(`Unsupported database provider: ${String(detection.recommended)}`)
  }
}

/**
 * Get information about the current database setup
 */
export function getDatabaseStatus() {
  const detection = detectDatabaseProviders()
  const currentDb = detection.recommended ? getDatabase() : null

  return {
    current: detection.recommended,
    available: detection.available,
    configured: detection.configured,
    provider_name: currentDb?.getProviderName() || null,
    is_configured: currentDb?.isConfigured() || false,
  }
}

// Export types for use in other files
export type { Database, DatabaseProvider, Message, MessageData, MessageQueryOptions }
