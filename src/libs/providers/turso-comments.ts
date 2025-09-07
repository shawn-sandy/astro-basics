/**
 * Turso Database Provider for Comments System
 * 
 * Implements the CommentDatabaseProvider interface using Turso (LibSQL) as the backend.
 * This provider adapts PostgreSQL patterns to SQLite syntax while maintaining
 * the same functionality as the Supabase provider.
 * 
 * Key adaptations for SQLite/LibSQL:
 * - UUID generation using crypto.randomUUID()
 * - SQLite-specific query syntax and data types
 * - Application-level access control (no RLS)
 * - Transaction management for consistency
 * - INTEGER boolean handling (1/0 instead of true/false)
 */

import type { ResultSet, InValue } from '@libsql/client'
import { 
  executeQuery, 
  executeTransaction, 
  isTursoConfigured, 
  validateTursoConfig 
} from '../turso'
import type { CommentData } from '../../types/comments'
import type {
  CommentDatabaseProvider,
  GetCommentsParams,
  CreateCommentParams,
  UpdateCommentParams,
  DeleteCommentParams,
  CreateUserParams,
  CommentsResult,
  User,
} from '../database-provider'

import {
  UserNotFoundError,
  CommentNotFoundError,
  UnauthorizedError,
  ConnectionError,
  DatabaseProviderError,
} from '../database-provider'

/**
 * Database row types for Turso/SQLite queries
 * These match the SQLite schema structure
 */
interface TursoCommentRow {
  id: string
  content: string
  author_id: string
  commentable_type: string
  commentable_id: string
  parent_comment_id: string | null
  status: string
  is_internal: number  // SQLite uses INTEGER (0/1) for booleans
  organization_id: string
  created_at: string
  updated_at: string
  // Author fields from JOIN
  author_full_name: string | null
  author_avatar_url: string | null
  author_clerk_id: string
  author_user_id: string
}

interface TursoUserRow {
  id: string
  clerk_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export class TursoCommentProvider implements CommentDatabaseProvider {
  /**
   * Get the provider name for debugging and logging
   */
  getProviderName(): string {
    return 'turso'
  }

  /**
   * Check if Turso is available and properly configured
   */
  async checkAvailability(): Promise<boolean> {
    if (!isTursoConfigured()) {
      return false
    }

    try {
      validateTursoConfig()
      
      // Test connection by checking if comments table exists
      await executeQuery(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='comments'
        LIMIT 1
      `)
      
      return true
    } catch {
      return false
    }
  }

  /**
   * Retrieve comments for a specific post or document
   * 
   * Adapts Supabase JOIN pattern to SQLite with explicit JOIN syntax.
   * Handles pagination, parent filtering, and status filtering.
   */
  async getComments(params: GetCommentsParams): Promise<CommentsResult> {
    try {
      // Build the base query with JOIN to get author information
      let query = `
        SELECT 
          c.id,
          c.content,
          c.author_id,
          c.commentable_type,
          c.commentable_id,
          c.parent_comment_id,
          c.status,
          c.is_internal,
          c.organization_id,
          c.created_at,
          c.updated_at,
          u.id as author_user_id,
          u.full_name as author_full_name,
          u.avatar_url as author_avatar_url,
          u.clerk_id as author_clerk_id
        FROM comments c
        INNER JOIN users u ON c.author_id = u.id
        WHERE c.commentable_type = ? 
          AND c.commentable_id = ?
          AND c.status = 'active'
          AND c.is_internal = 0
      `

      const queryParams: InValue[] = [params.type, params.id]

      // Filter by parent comment if specified (for threaded loading)
      if (params.parent_id) {
        query += ' AND c.parent_comment_id = ?'
        queryParams.push(params.parent_id)
      } else {
        // Get root comments only for initial load
        query += ' AND c.parent_comment_id IS NULL'
      }

      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
      queryParams.push(params.limit, params.offset)

      const result = await executeQuery(query, queryParams)

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as count
        FROM comments c
        WHERE c.commentable_type = ? 
          AND c.commentable_id = ?
          AND c.status = 'active'
          AND c.is_internal = 0
      `

      const countParams: InValue[] = [params.type, params.id]

      if (params.parent_id) {
        countQuery += ' AND c.parent_comment_id = ?'
        countParams.push(params.parent_id)
      } else {
        countQuery += ' AND c.parent_comment_id IS NULL'
      }

      const countResult = await executeQuery(countQuery, countParams)
      const totalCount = (countResult.rows[0] as any).count as number

      // Transform SQLite rows to CommentData format
      const comments: CommentData[] = result.rows.map(row => 
        this.transformCommentRow(row as any as TursoCommentRow)
      )

      return {
        comments,
        count: totalCount,
        has_more: comments.length === params.limit,
        pagination: {
          limit: params.limit,
          offset: params.offset,
          next_offset: params.offset + params.limit,
        },
      }
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to retrieve comments',
        'QUERY_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Create a new comment in the database
   * 
   * Uses crypto.randomUUID() for ID generation and handles SQLite-specific
   * boolean conversion (0/1) and timestamp handling.
   */
  async createComment(params: CreateCommentParams): Promise<CommentData> {
    try {
      const commentId = crypto.randomUUID()
      const now = new Date().toISOString()
      
      // Insert the comment using a transaction to ensure consistency
      const insertQuery = `
        INSERT INTO comments (
          id, content, author_id, commentable_type, commentable_id, 
          parent_comment_id, status, is_internal, organization_id, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `

      const insertParams = [
        commentId,
        params.content,
        params.author_id,
        params.commentable_type,
        params.commentable_id,
        params.parent_comment_id || null,
        params.status || 'active',
        params.is_internal ? 1 : 0,  // Convert boolean to INTEGER
        params.organization_id || import.meta.env.ORGANIZATION_ID || 'serve513-beta',
        now,
        now,
      ]

      // Get the created comment with author information
      const selectQuery = `
        SELECT 
          c.id,
          c.content,
          c.author_id,
          c.commentable_type,
          c.commentable_id,
          c.parent_comment_id,
          c.status,
          c.is_internal,
          c.organization_id,
          c.created_at,
          c.updated_at,
          u.id as author_user_id,
          u.full_name as author_full_name,
          u.avatar_url as author_avatar_url,
          u.clerk_id as author_clerk_id
        FROM comments c
        INNER JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `

      // Execute both queries in a transaction
      const results = await executeTransaction([
        { query: insertQuery, params: insertParams },
        { query: selectQuery, params: [commentId] }
      ])

      const selectResult = results[1]
      if (selectResult.rows.length === 0) {
        throw new DatabaseProviderError(
          'Failed to retrieve created comment',
          'INSERT_ERROR',
          'turso'
        )
      }

      return this.transformCommentRow(selectResult.rows[0] as any as TursoCommentRow)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to create comment',
        'INSERT_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Update an existing comment
   * 
   * Enforces ownership at the application level since SQLite doesn't have RLS.
   * Supports partial updates and proper error handling for not found/unauthorized cases.
   */
  async updateComment(params: UpdateCommentParams): Promise<CommentData> {
    try {
      // First, verify the comment exists and user owns it
      const checkQuery = `
        SELECT id FROM comments 
        WHERE id = ? AND author_id = ?
      `
      
      const checkResult = await executeQuery(checkQuery, [params.id, params.author_id])
      
      if (checkResult.rows.length === 0) {
        throw new CommentNotFoundError(params.id, 'turso')
      }

      // Build dynamic update query based on provided parameters
      const updateFields: string[] = []
      const updateParams: InValue[] = []

      if (params.content !== undefined) {
        updateFields.push('content = ?')
        updateParams.push(params.content)
      }

      if (params.status !== undefined) {
        updateFields.push('status = ?')
        updateParams.push(params.status)
      }

      if (updateFields.length === 0) {
        throw new DatabaseProviderError(
          'No valid fields provided for update',
          'INVALID_INPUT',
          'turso'
        )
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = ?')
      updateParams.push(new Date().toISOString())

      // Add WHERE clause parameters
      updateParams.push(params.id, params.author_id)

      const updateQuery = `
        UPDATE comments 
        SET ${updateFields.join(', ')}
        WHERE id = ? AND author_id = ?
      `

      // Get the updated comment with author information
      const selectQuery = `
        SELECT 
          c.id,
          c.content,
          c.author_id,
          c.commentable_type,
          c.commentable_id,
          c.parent_comment_id,
          c.status,
          c.is_internal,
          c.organization_id,
          c.created_at,
          c.updated_at,
          u.id as author_user_id,
          u.full_name as author_full_name,
          u.avatar_url as author_avatar_url,
          u.clerk_id as author_clerk_id
        FROM comments c
        INNER JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
      `

      // Execute both queries in a transaction
      const results = await executeTransaction([
        { query: updateQuery, params: updateParams },
        { query: selectQuery, params: [params.id] }
      ])

      const updateResult = results[0]
      if ((updateResult.rowsAffected ?? 0) === 0) {
        throw new CommentNotFoundError(params.id, 'turso')
      }

      const selectResult = results[1]
      if (selectResult.rows.length === 0) {
        throw new CommentNotFoundError(params.id, 'turso')
      }

      return this.transformCommentRow(selectResult.rows[0] as any as TursoCommentRow)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to update comment',
        'UPDATE_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Soft delete a comment by setting status to 'archived'
   * 
   * Preserves data for audit purposes while hiding from public display.
   * Enforces ownership at the application level.
   */
  async deleteComment(params: DeleteCommentParams): Promise<void> {
    try {
      const query = `
        UPDATE comments 
        SET status = 'archived', updated_at = ?
        WHERE id = ? AND author_id = ?
      `

      const result = await executeQuery(query, [
        new Date().toISOString(),
        params.id,
        params.author_id
      ])

      if ((result.rowsAffected ?? 0) === 0) {
        throw new CommentNotFoundError(params.id, 'turso')
      }
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to delete comment',
        'DELETE_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Retrieve user information by Clerk ID
   * 
   * Essential for user validation and authorization checks.
   * Returns null if user is not found in database.
   */
  async getUserByClerkId(clerkId: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE clerk_id = ?'
      const result = await executeQuery(query, [clerkId])

      if (result.rows.length === 0) {
        return null
      }

      return this.transformUserRow(result.rows[0] as any as TursoUserRow)
    } catch (error) {
      throw new DatabaseProviderError(
        'Failed to retrieve user',
        'QUERY_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Create a new user record in the database
   * 
   * Used for synchronizing user data from Clerk.
   * Generates UUID and handles SQLite timestamp format.
   */
  async createUser(params: CreateUserParams): Promise<User> {
    try {
      const userId = crypto.randomUUID()
      const now = new Date().toISOString()

      const insertQuery = `
        INSERT INTO users (id, clerk_id, full_name, email, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `

      const selectQuery = 'SELECT * FROM users WHERE id = ?'

      // Execute insert and select in transaction
      const results = await executeTransaction([
        { 
          query: insertQuery, 
          params: [userId, params.clerk_id, params.full_name, params.email, params.avatar_url, now, now]
        },
        { query: selectQuery, params: [userId] }
      ])

      const selectResult = results[1]
      if (selectResult.rows.length === 0) {
        throw new DatabaseProviderError(
          'Failed to retrieve created user',
          'INSERT_ERROR',
          'turso'
        )
      }

      return this.transformUserRow(selectResult.rows[0] as any as TursoUserRow)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to create user',
        'INSERT_ERROR',
        'turso',
        error as Error
      )
    }
  }

  /**
   * Transform Turso comment row to CommentData format
   * 
   * Handles SQLite-specific data types and converts to application format:
   * - INTEGER boolean (0/1) to boolean
   * - Flattened JOIN fields to nested author object
   * - Type casting for enums
   */
  private transformCommentRow(row: TursoCommentRow): CommentData {
    return {
      id: row.id,
      content: row.content,
      author_id: row.author_id,
      commentable_type: row.commentable_type as 'post' | 'doc',
      commentable_id: row.commentable_id,
      parent_comment_id: row.parent_comment_id,
      status: row.status as 'active' | 'hidden' | 'archived' | 'flagged',
      is_internal: row.is_internal === 1,  // Convert INTEGER to boolean
      organization_id: row.organization_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        id: row.author_user_id,
        full_name: row.author_full_name,
        avatar_url: row.author_avatar_url,
        clerk_id: row.author_clerk_id,
      },
    }
  }

  /**
   * Transform Turso user row to User format
   */
  private transformUserRow(row: TursoUserRow): User {
    return {
      id: row.id,
      clerk_id: row.clerk_id,
      full_name: row.full_name,
      email: row.email,
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
}