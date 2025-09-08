/**
 * Supabase Database Provider for Comments System
 *
 * Implements the CommentDatabaseProvider interface using Supabase as the backend.
 * This provider maintains all existing functionality while providing a clean
 * abstraction layer for the comment system.
 *
 * Key features:
 * - Row-Level Security (RLS) policy enforcement
 * - PostgreSQL-specific query optimizations
 * - UUID handling and foreign key relationships
 * - Real-time subscription support (future enhancement)
 */

import type { SupabaseClient } from '@supabase/supabase-js'

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
import { CommentNotFoundError, ConnectionError, DatabaseProviderError } from '../database-provider'
import type { Database } from '../database.types'
import { createServerSupabaseClient, validateSupabaseConfig } from '../supabase-server'

/**
 * Database row types for Supabase queries
 * These match the exact structure returned by Supabase
 */
interface SupabaseCommentRow {
  id: string
  content: string
  author_id: string
  commentable_type: string
  commentable_id: string
  parent_comment_id: string | null
  status: string
  is_internal: boolean
  organization_id: string
  created_at: string
  updated_at: string
  author:
    | {
        id: string
        full_name: string | null
        avatar_url: string | null
        clerk_id: string
      }[]
    | {
        // Supabase can return either arrays or objects for joined relations
        id: string
        full_name: string | null
        avatar_url: string | null
        clerk_id: string
      }
}

interface SupabaseUserRow {
  id: string
  clerk_id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export class SupabaseCommentProvider implements CommentDatabaseProvider {
  private client: SupabaseClient<Database> | null = null

  constructor() {
    this.client = createServerSupabaseClient()
  }

  /**
   * Get the provider name for debugging and logging
   */
  getProviderName(): string {
    return 'supabase'
  }

  /**
   * Check if Supabase is available and properly configured
   */
  async checkAvailability(): Promise<boolean> {
    if (!validateSupabaseConfig()) {
      return false
    }

    if (!this.client) {
      return false
    }

    try {
      // Test connection by checking if comments table exists
      const { error } = await this.client.from('comments').select('id').limit(1)

      return !error
    } catch {
      return false
    }
  }

  /**
   * Retrieve comments for a specific post or document
   *
   * Maintains all existing functionality including:
   * - Pagination support
   * - Parent comment filtering for threaded loading
   * - Active status filtering
   * - Public comment filtering (is_internal = false)
   * - Author information population via JOIN
   */
  async getComments(params: GetCommentsParams): Promise<CommentsResult> {
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      let query = this.client
        .from('comments')
        .select(
          `
          id,
          content,
          author_id,
          commentable_type,
          commentable_id,
          parent_comment_id,
          status,
          is_internal,
          organization_id,
          created_at,
          updated_at,
          author:users(
            id,
            full_name,
            avatar_url,
            clerk_id
          )
        `
        )
        .eq('commentable_type', params.type)
        .eq('commentable_id', params.id)
        .eq('status', 'active')
        .eq('is_internal', false)

      // Filter by parent comment if specified (for threaded loading)
      if (params.parent_id) {
        query = query.eq('parent_comment_id', params.parent_id)
      } else {
        // Get root comments only for initial load
        query = query.is('parent_comment_id', null)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1)

      if (error) {
        throw new DatabaseProviderError(
          `Failed to fetch comments: ${error.message}`,
          'QUERY_ERROR',
          'supabase',
          error
        )
      }

      // Transform Supabase rows to CommentData format
      const comments: CommentData[] = (data || []).map(this.transformCommentRow)

      return {
        comments,
        count: count || 0,
        has_more: (data?.length || 0) === params.limit,
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
        'supabase',
        error as Error
      )
    }
  }

  /**
   * Create a new comment in the database
   *
   * Handles:
   * - Foreign key relationships (author_id)
   * - Default values for status and organization_id
   * - Author information population in response
   */
  async createComment(params: CreateCommentParams): Promise<CommentData> {
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      const commentData = {
        content: params.content,
        author_id: params.author_id,
        commentable_type: params.commentable_type,
        commentable_id: params.commentable_id,
        parent_comment_id: params.parent_comment_id || null,
        status: params.status || 'active',
        is_internal: params.is_internal || false,
        organization_id:
          params.organization_id || import.meta.env.ORGANIZATION_ID || 'serve513-beta',
      }

      const { data, error } = await this.client
        .from('comments')
        .insert(commentData)
        .select(
          `
          id,
          content,
          author_id,
          commentable_type,
          commentable_id,
          parent_comment_id,
          status,
          is_internal,
          organization_id,
          created_at,
          updated_at,
          author:users(
            id,
            full_name,
            avatar_url,
            clerk_id
          )
        `
        )
        .single()

      if (error) {
        throw new DatabaseProviderError(
          `Failed to create comment: ${error.message}`,
          'INSERT_ERROR',
          'supabase',
          error
        )
      }

      if (!data) {
        throw new DatabaseProviderError(
          'No comment data returned after creation',
          'INSERT_ERROR',
          'supabase'
        )
      }

      return this.transformCommentRow(data)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to create comment',
        'INSERT_ERROR',
        'supabase',
        error as Error
      )
    }
  }

  /**
   * Update an existing comment
   *
   * Enforces ownership via author_id matching and RLS policies.
   * Supports partial updates for content and status changes.
   */
  async updateComment(params: UpdateCommentParams): Promise<CommentData> {
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      // Prepare update data - only include fields that were provided
      const updateData: Partial<SupabaseCommentRow> = {}

      if (params.content !== undefined) {
        updateData.content = params.content
      }

      if (params.status !== undefined) {
        updateData.status = params.status
      }

      if (Object.keys(updateData).length === 0) {
        throw new DatabaseProviderError(
          'No valid fields provided for update',
          'INVALID_INPUT',
          'supabase'
        )
      }

      const { data, error } = await this.client
        .from('comments')
        .update(updateData)
        .eq('id', params.id)
        .eq('author_id', params.author_id) // Ownership enforcement
        .in('commentable_type', ['post', 'doc']) // Additional safety check
        .select(
          `
          id,
          content,
          author_id,
          commentable_type,
          commentable_id,
          parent_comment_id,
          status,
          is_internal,
          organization_id,
          created_at,
          updated_at,
          author:users(
            id,
            full_name,
            avatar_url,
            clerk_id
          )
        `
        )
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new CommentNotFoundError(params.id, 'supabase')
        }
        throw new DatabaseProviderError(
          `Failed to update comment: ${error.message}`,
          'UPDATE_ERROR',
          'supabase',
          error
        )
      }

      if (!data) {
        throw new CommentNotFoundError(params.id, 'supabase')
      }

      return this.transformCommentRow(data)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to update comment',
        'UPDATE_ERROR',
        'supabase',
        error as Error
      )
    }
  }

  /**
   * Soft delete a comment by setting status to 'archived'
   *
   * Preserves data for audit purposes while hiding from public display.
   * Enforces ownership via author_id matching.
   */
  async deleteComment(params: DeleteCommentParams): Promise<void> {
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      const { error } = await this.client
        .from('comments')
        .update({ status: 'archived' })
        .eq('id', params.id)
        .eq('author_id', params.author_id) // Ownership enforcement
        .in('commentable_type', ['post', 'doc']) // Additional safety check

      if (error) {
        if (error.code === 'PGRST116') {
          throw new CommentNotFoundError(params.id, 'supabase')
        }
        throw new DatabaseProviderError(
          `Failed to delete comment: ${error.message}`,
          'DELETE_ERROR',
          'supabase',
          error
        )
      }
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to delete comment',
        'DELETE_ERROR',
        'supabase',
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
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('clerk_id', clerkId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // User not found - this is not an error condition
          return null
        }
        throw new DatabaseProviderError(
          `Failed to fetch user: ${error.message}`,
          'QUERY_ERROR',
          'supabase',
          error
        )
      }

      return this.transformUserRow(data)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to retrieve user',
        'QUERY_ERROR',
        'supabase',
        error as Error
      )
    }
  }

  /**
   * Create a new user record in the database
   *
   * Used for synchronizing user data from Clerk.
   * Typically called when a user creates their first comment.
   */
  async createUser(params: CreateUserParams): Promise<User> {
    if (!this.client) {
      throw new ConnectionError('supabase')
    }

    try {
      const { data, error } = await this.client
        .from('users')
        .insert({
          clerk_id: params.clerk_id,
          full_name: params.full_name,
          email: params.email,
          avatar_url: params.avatar_url,
        })
        .select('*')
        .single()

      if (error) {
        throw new DatabaseProviderError(
          `Failed to create user: ${error.message}`,
          'INSERT_ERROR',
          'supabase',
          error
        )
      }

      if (!data) {
        throw new DatabaseProviderError(
          'No user data returned after creation',
          'INSERT_ERROR',
          'supabase'
        )
      }

      return this.transformUserRow(data)
    } catch (error) {
      if (error instanceof DatabaseProviderError) {
        throw error
      }
      throw new DatabaseProviderError(
        'Failed to create user',
        'INSERT_ERROR',
        'supabase',
        error as Error
      )
    }
  }

  /**
   * Transform Supabase comment row to CommentData format
   *
   * Handles type conversion and ensures consistent data structure
   * across the application regardless of database backend.
   */
  private transformCommentRow(row: SupabaseCommentRow): CommentData {
    // Handle both array and object formats for author data
    // Supabase can return either depending on the query structure
    let author
    if (Array.isArray(row.author)) {
      // Array format: take first element
      author = row.author?.[0]
    } else if (row.author && typeof row.author === 'object') {
      // Object format: use directly
      author = row.author
    }

    if (!author) {
      console.error('Comment transform error:', {
        commentId: row.id,
        authorId: row.author_id,
        authorData: row.author,
        hasAuthor: !!row.author,
        isArray: Array.isArray(row.author),
        authorType: typeof row.author,
        authorLength: row.author?.length || 0,
      })
      throw new DatabaseProviderError(
        `Comment missing author information for comment ${row.id} with author_id ${row.author_id}`,
        'INVALID_DATA',
        'supabase'
      )
    }

    return {
      id: row.id,
      content: row.content,
      author_id: row.author_id,
      commentable_type: row.commentable_type as 'post' | 'doc',
      commentable_id: row.commentable_id,
      parent_comment_id: row.parent_comment_id,
      status: row.status as 'active' | 'hidden' | 'archived' | 'flagged',
      is_internal: row.is_internal,
      organization_id: row.organization_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        id: author.id,
        full_name: author.full_name,
        avatar_url: author.avatar_url,
        clerk_id: author.clerk_id,
      },
    }
  }

  /**
   * Transform Supabase user row to User format
   */
  private transformUserRow(row: SupabaseUserRow): User {
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
