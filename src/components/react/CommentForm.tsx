import React, { useState } from 'react'

import { CSRF_CONFIG } from '#utils/csrf'

import Alert from './Alert'

interface Comment {
  id: string
  content: string
  author_id: string
  commentable_type: string
  commentable_id: string
  parent_comment_id?: string
  status: string
  created_at: string
  updated_at: string
}

interface CommentFormProps {
  readonly postId: string
  readonly postType: 'post' | 'doc'
  readonly parentCommentId?: string
  readonly onSubmitSuccess?: (comment: Comment) => void
  readonly csrfToken?: string
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  postType,
  parentCommentId,
  onSubmitSuccess,
  csrfToken,
}) => {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const MAX_CHARACTERS = 1000
  const characterCount = content.length
  const remainingCharacters = MAX_CHARACTERS - characterCount

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    if (newContent.length <= MAX_CHARACTERS) {
      setContent(newContent)
      if (error) setError('')
    }
  }

  const validateForm = () => {
    if (!content.trim()) {
      setError('Please enter your comment')
      return false
    }

    if (content.length > MAX_CHARACTERS) {
      setError(`Comment must be ${MAX_CHARACTERS} characters or less`)
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!validateForm()) {
      setIsSubmitting(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('content', content.trim())
      formData.append('commentable_type', postType)
      formData.append('commentable_id', postId)
      if (parentCommentId) {
        formData.append('parent_comment_id', parentCommentId)
      }
      if (csrfToken) {
        formData.append(CSRF_CONFIG.FIELD_NAME, csrfToken)
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to post comment')
      }

      const newComment = await response.json()
      setContent('')
      setIsSubmitted(true)

      if (onSubmitSuccess) {
        onSubmitSuccess(newComment)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCharacterCountClass = () => {
    if (remainingCharacters < 100) return 'char-counter error'
    if (remainingCharacters < 200) return 'char-counter warning'
    return 'char-counter'
  }

  if (isSubmitted) {
    return (
      <Alert type="success">
        <p>Your comment has been posted successfully!</p>
      </Alert>
    )
  }

  return (
    <section className="comment-form">
      {error && (
        <Alert type="error">
          <p>{error}</p>
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="Post comment">
        {csrfToken && <input type="hidden" name={CSRF_CONFIG.FIELD_NAME} value={csrfToken} />}

        <div>
          <label
            htmlFor={`comment-content-${postId}${parentCommentId ? `-${parentCommentId}` : ''}`}
          >
            {parentCommentId ? 'Reply to comment' : 'Add a comment'}
          </label>
          <textarea
            id={`comment-content-${postId}${parentCommentId ? `-${parentCommentId}` : ''}`}
            name="content"
            value={content}
            onChange={handleContentChange}
            rows={4}
            placeholder="Share your thoughts..."
            required
            aria-invalid={!!error}
            aria-describedby={
              error
                ? 'comment-error'
                : `comment-counter-${postId}${parentCommentId ? `-${parentCommentId}` : ''}`
            }
            disabled={isSubmitting}
          />

          <div
            id={`comment-counter-${postId}${parentCommentId ? `-${parentCommentId}` : ''}`}
            className={getCharacterCountClass()}
            aria-live="polite"
          >
            {remainingCharacters} characters remaining
          </div>
        </div>

        <button
          type="submit"
          data-btn="pill"
          disabled={isSubmitting || !content.trim() || content.length > MAX_CHARACTERS}
          aria-describedby={isSubmitting ? 'submit-status' : undefined}
        >
          <b>{isSubmitting ? 'Posting...' : parentCommentId ? 'Post Reply' : 'Post Comment'}</b>
        </button>

        {isSubmitting && (
          <span id="submit-status" className="sr-only" aria-live="assertive">
            Comment is being posted
          </span>
        )}
      </form>
    </section>
  )
}

export default CommentForm
