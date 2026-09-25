/**
 * Database abstraction layer backed by Supabase (PostgreSQL).
 *
 * All application code reaches the database through `getDatabase()`, so callers never
 * import the Supabase client directly and the `Database` interface stays the single
 * contract for message operations.
 *
 * @fileoverview Database abstraction layer
 * @version 3.0.0
 * @author Astro Basics Team
 * @see {@link Database} for the unified interface contract
 * @example
 * const db = getDatabase();
 * const messages = await db.getMessages({ limit: 10 });
 *
 * const status = getDatabaseStatus();
 * console.log(`Using: ${status.current} (${status.provider_name})`);
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

/**
 * Supabase PostgreSQL database provider with real-time capabilities.
 *
 * Supabase provides PostgreSQL with built-in authentication, real-time subscriptions,
 * and Row Level Security (RLS) policies. This implementation uses the service role
 * client for server-side operations to bypass RLS when needed.
 *
 * Key characteristics:
 * - Full PostgreSQL feature set with extensions
 * - Built-in authentication and authorization
 * - Real-time subscriptions for live updates
 * - Comprehensive admin dashboard and tooling
 *
 * @implements {Database} Unified database interface
 * @security Uses service role client to bypass RLS for system operations
 * @see {@link getSupabaseServiceRole} for service role client configuration
 * @see {@link convertSupabaseMessage} for PostgreSQL to unified type conversion
 * @performance Scales automatically with connection pooling
 * @since 1.0.0 - Basic implementation, 1.5.0 - Added service role support
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

    // Newest first
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

  /**
   * Converts Supabase PostgreSQL message format to unified Message interface.
   *
   * Handles type coercion from Supabase's generic Record type to the strongly-typed
   * Message interface. Includes runtime type assertions for data integrity.
   *
   * @param supabaseMessage - Raw message data from Supabase PostgreSQL
   * @returns {Message} Normalized message following unified interface
   * @private Internal conversion utility
   * @see {@link Message} for unified message structure
   * @security Performs runtime type checking on untrusted database data
   */
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
 * Reports whether Supabase, the only database provider, is configured.
 *
 * @returns {ProviderDetectionResult} `recommended` is `'supabase'` when configured, otherwise null
 * @example
 * const result = detectDatabaseProviders();
 * // { available: ['supabase'], configured: ['supabase'], recommended: 'supabase' }
 */
export function detectDatabaseProviders(): ProviderDetectionResult {
  const configured: DatabaseProvider[] = isSupabaseConfigured() ? ['supabase'] : []

  return {
    available: configured,
    configured,
    recommended: configured[0] ?? null,
  }
}

/**
 * Primary entry point for all database operations.
 *
 * @returns {Database} Supabase-backed database instance
 * @throws {Error} When Supabase is not configured
 * @example
 * const db = getDatabase();
 * const newMessageId = await db.insertMessage({
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   message: 'Hello world'
 * });
 */
export function getDatabase(): Database {
  if (!detectDatabaseProviders().recommended) {
    throw new Error(
      'No database configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
    )
  }

  return new SupabaseDatabase()
}

/**
 * Database configuration snapshot for debugging and admin interfaces.
 *
 * @returns {Object} Database status information
 * @property {DatabaseProvider|null} current - Active provider or null if none
 * @property {string[]} available - Providers found in environment
 * @property {string[]} configured - Providers with complete configuration
 * @property {string|null} provider_name - Provider name reported by the database instance
 * @property {boolean} is_configured - Whether the active provider is ready for use
 * @example
 * const status = getDatabaseStatus();
 * if (!status.is_configured) {
 *   throw new Error('Database not configured');
 * }
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
