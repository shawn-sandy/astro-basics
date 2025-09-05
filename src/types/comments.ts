/**
 * Shared TypeScript interfaces for the comment system
 * Used by both Astro components and React components
 * Matches the Supabase comments table schema
 */

export interface CommentAuthor {
  id: string
  full_name: string | null
  avatar_url: string | null
  clerk_id: string
}

export interface CommentData {
  id: string
  content: string
  author_id: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id: string | null
  status: 'active' | 'hidden' | 'archived' | 'flagged'
  is_internal: boolean
  organization_id: string | null
  created_at: string
  updated_at: string
  author: CommentAuthor
  replies?: CommentData[]
}

export interface CommentFormData {
  content: string
  commentable_type: 'post' | 'doc'
  commentable_id: string
  parent_comment_id?: string
}

export interface CommentSystemAvailability {
  enabled: boolean
  reason?: string
  details?: {
    hasEnvironment: boolean
    hasDatabase: boolean
    hasCommentsTable: boolean
  }
}

// Props interfaces for React components
export interface CommentFormProps {
  readonly postId: string
  readonly postType: 'post' | 'doc'
  readonly parentCommentId?: string
  readonly onSubmitSuccess?: (comment: CommentData) => void
  readonly csrfToken?: string
}

export interface CommentsListProps {
  readonly postId: string
  readonly postType: 'post' | 'doc'
  readonly initialComments?: CommentData[]
  readonly currentUserId?: string
  readonly csrfToken?: string
}

export interface CommentProps {
  readonly comment: CommentData
  readonly currentUserId: string | undefined
  readonly depth: number
  readonly maxDepth?: number
  readonly postId: string
  readonly postType: 'post' | 'doc'
  readonly csrfToken: string | undefined
  readonly onReply: ((parentId: string) => void) | undefined
  readonly onEdit: ((commentId: string, content: string) => void) | undefined
  readonly onDelete: ((commentId: string) => void) | undefined
  readonly onNewComment: ((newComment: CommentData) => void) | undefined
}

// API response types
export interface CommentApiResponse {
  success: boolean
  data?: CommentData
  error?: string
  message?: string
}

export interface CommentsApiResponse {
  success: boolean
  data?: CommentData[]
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}
