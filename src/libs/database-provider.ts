/**
 * Database Provider Interface for Comments System
 * 
 * This interface defines the abstraction layer that allows the comments system
 * to work with different database backends (Supabase, Turso, etc.) without
 * changing the core API logic.
 * 
 * Each provider implementation must handle:
 * - Database-specific query syntax (PostgreSQL vs SQLite)
 * - Authentication and authorization patterns
 * - Data type conversions and UUID handling
 * - Transaction management
 * - Error handling and response formatting
 */

import type { CommentData, CommentAuthor } from '../types/comments'

// Core parameter interfaces for database operations
export interface GetCommentsParams {
  type: 'post' | 'doc'
  id: string
  limit: number
  offset: number
  parent_id?: string | null
}

export interface CreateCommentParams {
  content: string
  author_id: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id?: string | null
  status?: 'active' | 'hidden' | 'archived' | 'flagged'
  is_internal?: boolean
  organization_id?: string
}

export interface UpdateCommentParams {
  id: string
  author_id: string // For authorization - user can only update their own comments
  content?: string
  status?: 'active' | 'hidden' | 'archived' | 'flagged'
}

export interface DeleteCommentParams {
  id: string
  author_id: string // For authorization - user can only delete their own comments
}

export interface CreateUserParams {
  clerk_id: string
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
}

// Response interfaces for database operations
export interface CommentsResult {
  comments: CommentData[]
  count: number
  has_more: boolean
  pagination: {
    limit: number
    offset: number
    next_offset: number
  }
}

export interface User {
  id: string
  clerk_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

/**
 * Main database provider interface that all comment system providers must implement
 * 
 * This interface ensures consistent behavior across different database backends
 * while allowing for provider-specific optimizations and feature implementations.
 */
export interface CommentDatabaseProvider {
  /**
   * Retrieve comments for a specific post or document
   * 
   * Supports pagination, filtering by parent comment (for threaded loading),
   * and excludes soft-deleted or internal comments from public results.
   * 
   * @param params - Query parameters including type, id, pagination, and optional parent filtering
   * @returns Promise resolving to comments with pagination metadata
   */
  getComments(params: GetCommentsParams): Promise<CommentsResult>

  /**
   * Create a new comment in the database
   * 
   * Handles content sanitization, user validation, and proper foreign key relationships.
   * Should respect rate limiting and CSRF validation at the API layer.
   * 
   * @param params - Comment data including content, author, and target information
   * @returns Promise resolving to the created comment with populated author information
   */
  createComment(params: CreateCommentParams): Promise<CommentData>

  /**
   * Update an existing comment (content or status)
   * 
   * Enforces ownership validation - users can only update their own comments.
   * Supports both content updates and status changes (e.g., soft delete via 'archived').
   * 
   * @param params - Update parameters including comment ID, author verification, and new values
   * @returns Promise resolving to the updated comment with populated author information
   */
  updateComment(params: UpdateCommentParams): Promise<CommentData>

  /**
   * Soft delete a comment by setting status to 'archived'
   * 
   * Preserves comment data for audit purposes while hiding from public display.
   * Enforces ownership validation - users can only delete their own comments.
   * 
   * @param params - Delete parameters including comment ID and author verification
   * @returns Promise resolving when deletion is complete
   */
  deleteComment(params: DeleteCommentParams): Promise<void>

  /**
   * Retrieve user information by Clerk ID
   * 
   * Used for user validation and synchronization between Clerk authentication
   * and the comment system's user records. Essential for authorization checks.
   * 
   * @param clerkId - The Clerk user ID to search for
   * @returns Promise resolving to user data or null if not found
   */
  getUserByClerkId(clerkId: string): Promise<User | null>

  /**
   * Create a new user record in the database
   * 
   * Used for synchronizing user data from Clerk into the comment system.
   * Typically called when a user comments for the first time.
   * 
   * @param params - User creation parameters from Clerk user data
   * @returns Promise resolving to the created user record
   */
  createUser(params: CreateUserParams): Promise<User>

  /**
   * Check if the database provider is available and properly configured
   * 
   * Validates connection, required environment variables, and table existence.
   * Used by the availability checker to determine if comments can be enabled.
   * 
   * @returns Promise resolving to true if provider is ready, false otherwise
   */
  checkAvailability(): Promise<boolean>

  /**
   * Get the provider name for debugging and logging purposes
   * 
   * @returns The provider identifier (e.g., 'supabase', 'turso')
   */
  getProviderName(): string
}

/**
 * Factory function type for creating database providers
 * 
 * Allows for lazy initialization and configuration-based provider selection
 * without importing all provider implementations at startup.
 */
export type DatabaseProviderFactory = () => CommentDatabaseProvider | null

/**
 * Error types that providers should throw for consistent error handling
 */
export class DatabaseProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'DatabaseProviderError'
  }
}

export class UserNotFoundError extends DatabaseProviderError {
  constructor(clerkId: string, provider: string) {
    super(`User with Clerk ID ${clerkId} not found`, 'USER_NOT_FOUND', provider)
  }
}

export class CommentNotFoundError extends DatabaseProviderError {
  constructor(commentId: string, provider: string) {
    super(`Comment with ID ${commentId} not found`, 'COMMENT_NOT_FOUND', provider)
  }
}

export class UnauthorizedError extends DatabaseProviderError {
  constructor(operation: string, provider: string) {
    super(`Unauthorized to perform ${operation}`, 'UNAUTHORIZED', provider)
  }
}

export class ConnectionError extends DatabaseProviderError {
  constructor(provider: string, originalError?: Error) {
    super(`Failed to connect to ${provider} database`, 'CONNECTION_ERROR', provider, originalError)
  }
}