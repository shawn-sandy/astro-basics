import React, { useState } from 'react'

import CommentForm from './CommentForm'

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

interface CommentProps {
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

const Comment: React.FC<CommentProps> = ({
  comment,
  currentUserId,
  depth,
  maxDepth = 3,
  postId,
  postType,
  csrfToken,
  onReply,
  onEdit,
  onDelete,
  onNewComment,
}) => {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const isAuthor = currentUserId === comment.author.clerk_id
  const canReply = depth < maxDepth && currentUserId
  const hasReplies = comment.replies && comment.replies.length > 0

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return date.toLocaleDateString()
  }

  const handleReply = () => {
    setIsReplying(!isReplying)
    setIsEditing(false)
    if (onReply) {
      onReply(comment.id)
    }
  }

  const handleEdit = () => {
    setIsEditing(!isEditing)
    setIsReplying(false)
    setEditContent(comment.content)
    if (onEdit) {
      onEdit(comment.id, comment.content)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(comment.content)
  }

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return

    try {
      const formData = new FormData()
      formData.append('content', editContent.trim())
      if (csrfToken) {
        formData.append('csrf_token', csrfToken)
      }

      const response = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to update comment')
      }

      const updatedComment: CommentData = await response.json()

      // Update the comment in the parent component
      if (onEdit) {
        onEdit(comment.id, updatedComment.content)
      }

      setIsEditing(false)
    } catch (err) {
      console.error('Failed to update comment:', err)
      // In a real implementation, you'd want to show this error to the user
    }
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      if (onDelete) {
        onDelete(comment.id)
      }
    }
  }

  const handleNewReply = (newComment: CommentData) => {
    setIsReplying(false)
    if (onNewComment) {
      onNewComment(newComment)
    }
  }

  return (
    <div
      className={`comment ${depth > 0 ? `depth-${Math.min(depth, 3)}` : ''}`}
      role="article"
      aria-label={`Comment by ${comment.author.full_name || 'Anonymous User'}`}
    >
      <div className="comment-header">
        {comment.author.avatar_url && (
          <img
            src={comment.author.avatar_url}
            alt={`${comment.author.full_name || 'User'}'s avatar`}
            className="author-avatar"
            width="32"
            height="32"
          />
        )}
        <div className="comment-meta">
          <span className="author-name">{comment.author.full_name || 'Anonymous User'}</span>
          <time
            className="comment-time"
            dateTime={comment.created_at}
            title={new Date(comment.created_at).toLocaleString()}
          >
            {formatTimestamp(comment.created_at)}
          </time>
          {comment.created_at !== comment.updated_at && (
            <span
              className="edited-indicator"
              title={`Edited ${formatTimestamp(comment.updated_at)}`}
            >
              (edited)
            </span>
          )}
        </div>
      </div>

      <div className="comment-content">
        {isEditing ? (
          <div className="comment-edit-form">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              maxLength={1000}
              aria-label="Edit comment"
              className="edit-textarea"
            />
            <div className="edit-actions">
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || editContent.length > 1000}
                className="btn btn-sm btn-primary"
                type="button"
              >
                Save
              </button>
              <button onClick={handleCancelEdit} className="btn btn-sm" type="button">
                Cancel
              </button>
            </div>
            <div
              className={`char-counter ${editContent.length > 900 ? 'warning' : ''} ${editContent.length > 1000 ? 'error' : ''}`}
            >
              {1000 - editContent.length} characters remaining
            </div>
          </div>
        ) : (
          <div className="comment-text">
            <p>{comment.content}</p>
          </div>
        )}
      </div>

      <div className="comment-actions">
        {canReply && (
          <button
            onClick={handleReply}
            className="comment-action-btn"
            type="button"
            aria-expanded={isReplying}
            aria-controls={isReplying ? `reply-form-${comment.id}` : undefined}
          >
            {isReplying ? 'Cancel Reply' : 'Reply'}
          </button>
        )}

        {isAuthor && !isEditing && (
          <>
            <button
              onClick={handleEdit}
              className="comment-action-btn"
              type="button"
              aria-label="Edit this comment"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="comment-action-btn delete"
              type="button"
              aria-label="Delete this comment"
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Reply form */}
      {isReplying && (
        <div
          id={`reply-form-${comment.id}`}
          className="reply-form"
          role="region"
          aria-label="Reply form"
        >
          <CommentForm
            postId={postId}
            postType={postType}
            parentCommentId={comment.id}
            onSubmitSuccess={handleNewReply}
            csrfToken={csrfToken}
          />
        </div>
      )}

      {/* Nested replies */}
      {hasReplies && (
        <div className="comment-replies" role="group" aria-label="Replies">
          {comment.replies!.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              maxDepth={maxDepth}
              postId={postId}
              postType={postType}
              csrfToken={csrfToken}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onNewComment={onNewComment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Comment
