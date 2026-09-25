/**
 * Unified database types for astro-basics project
 * Backed by Supabase (PostgreSQL)
 */

export type DatabaseProvider = 'supabase'

/**
 * Message row returned by the database abstraction layer
 */
export interface Message {
  id: number
  name: string
  email: string
  subject?: string | null
  message: string
  ip_address?: string | null
  user_agent?: string | null
  is_read: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

/**
 * Input data for creating new messages
 */
export interface MessageData {
  name: string
  email: string
  subject?: string
  message: string
  ip_address?: string
  user_agent?: string
}

/**
 * Query options for retrieving messages
 */
export interface MessageQueryOptions {
  is_read?: boolean
  is_archived?: boolean
  limit?: number
  offset?: number
}

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  provider: DatabaseProvider
  connectionString?: string
  retries: number
  timeout: number
}

/**
 * Database provider interface
 * Simple abstraction over existing database operations
 */
export interface Database {
  // Core message operations (what the app actually uses)
  insertMessage(data: MessageData): Promise<number>
  getMessages(options?: MessageQueryOptions): Promise<Message[]>
  getMessageById(id: number): Promise<Message | null>
  markMessageAsRead(id: number): Promise<boolean>
  archiveMessage(id: number): Promise<boolean>

  // Provider information
  getProviderName(): string
  isConfigured(): boolean
}

/**
 * Database provider detection result
 */
export interface ProviderDetectionResult {
  available: DatabaseProvider[]
  configured: DatabaseProvider[]
  recommended: DatabaseProvider | null
}
