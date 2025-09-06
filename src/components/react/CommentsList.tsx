import React, { useState, useEffect, useCallback } from 'react'

import Alert from './Alert'
import Comment from './Comment'

// Comment data structure following the Supabase schema
interface CommentAuthor {
  id: string
  full_name: string | null
  avatar_url: string | null
  clerk_id: string
}

interface CommentData {
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

interface CommentsListProps {
  readonly postId: string
  readonly postType: 'post' | 'doc'
  readonly initialComments?: CommentData[]
  readonly currentUserId?: string
  readonly csrfToken?: string
}

const MAX_COMMENT_DEPTH = 3
const COMMENTS_PER_PAGE = 20

const CommentsList: React.FC<CommentsListProps> = ({
  postId,
  postType,
  initialComments = [],
  currentUserId,
  csrfToken,
}) => {
  const [comments, setComments] = useState<CommentData[]>(initialComments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialComments.length >= COMMENTS_PER_PAGE)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)

  // Organize comments into nested threads
  const organizeComments = useCallback((flatComments: CommentData[]): CommentData[] => {
    const commentMap = new Map<string, CommentData>()
    const rootComments: CommentData[] = []

    // First pass: create map of all comments
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: organize into threads
    commentMap.forEach(comment => {
      if (comment.parent_comment_id && commentMap.has(comment.parent_comment_id)) {
        const parent = commentMap.get(comment.parent_comment_id)!
        parent.replies = parent.replies || []
        parent.replies.push(comment)
        // Sort replies by creation date (oldest first for nested replies)
        parent.replies.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      } else {
        rootComments.push(comment)
      }
    })

    // Sort root comments by creation date (newest first)
    return rootComments.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [])

  const [organizedComments, setOrganizedComments] = useState<CommentData[]>(() =>
    organizeComments(initialComments)
  )

  // Update organized comments when comments change
  useEffect(() => {
    setOrganizedComments(organizeComments(comments))
  }, [comments, organizeComments])

  const loadMoreComments = async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `/api/comments?type=${postType}&id=${postId}&offset=${page * COMMENTS_PER_PAGE}&limit=${COMMENTS_PER_PAGE}`
      )

      if (!response.ok) {
        throw new Error('Failed to load comments')
      }

      const responseData = await response.json()
      const newComments: CommentData[] = responseData.comments || []

      setHasMore(responseData.has_more || false)

      setComments(prev => [...prev, ...newComments])
      setPage(prev => prev + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more comments')
    } finally {
      setLoading(false)
    }
  }

  const handleNewComment = (newComment: CommentData) => {
    setComments(prev => [newComment, ...prev])
    setReplyingTo(null)
  }

  const handleReply = (commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId)
  }

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return

    try {
      const formData = new FormData()
      if (csrfToken) {
        formData.append('csrf_token', csrfToken)
      }

      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to delete comment')
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleCommentUpdate = (commentId: string, newContent: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? { ...comment, content: newContent, updated_at: new Date().toISOString() }
          : comment
      )
    )
  }

  const renderComment = (comment: CommentData, depth = 0): React.ReactElement => (
    <Comment
      key={comment.id}
      comment={comment}
      currentUserId={currentUserId}
      depth={depth}
      maxDepth={MAX_COMMENT_DEPTH}
      postId={postId}
      postType={postType}
      csrfToken={csrfToken}
      onReply={handleReply}
      onEdit={handleCommentUpdate}
      onDelete={handleDelete}
      onNewComment={handleNewComment}
    />
  )

  if (error) {
    return (
      <Alert type="error">
        <p>Error loading comments: {error}</p>
        <button onClick={() => setError('')} className="btn btn-sm" type="button">
          Dismiss
        </button>
      </Alert>
    )
  }

  return (
    <div className="comments-list" role="region" aria-label="Comments section">
      {organizedComments.length === 0 ? (
        <div className="no-comments">
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <>
          <div className="comments-count">
            <h3>
              {comments.length} comment{comments.length !== 1 ? 's' : ''}
            </h3>
          </div>

          <div className="comments-container">
            {organizedComments.map(comment => renderComment(comment))}
          </div>

          {hasMore && (
            <div className="load-more">
              <button
                onClick={loadMoreComments}
                disabled={loading}
                className="btn"
                type="button"
                aria-describedby={loading ? 'load-more-status' : undefined}
              >
                {loading ? 'Loading...' : 'Load More Comments'}
              </button>
              {loading && (
                <span id="load-more-status" className="sr-only" aria-live="polite">
                  Loading more comments
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CommentsList
