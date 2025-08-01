# Astro DB Implementation Examples

Real-world examples of integrating Astro DB into the astro-basics project.

## Table of Contents

1. [Converting Existing Pages](#converting-existing-pages)
2. [Building New Features](#building-new-features)
3. [Component Integration](#component-integration)
4. [Advanced Implementations](#advanced-implementations)

## Converting Existing Pages

### Convert Blog Page from Content Collections to Database

#### Original (Content Collections)

```astro
---
// src/pages/blog.astro (original)
import { getCollection } from 'astro:content'
import Layout from '#layouts/Layout.astro'
import BlogPosts from '#components/astro/BlogPosts.astro'

const posts = await getCollection('posts', ({ data }) => {
  return data.publish !== false
})

const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
---

<Layout title="Blog">
  <BlogPosts posts={sortedPosts} />
</Layout>
```

#### Updated (Database)

```astro
---
// src/pages/blog.astro (database version)
import { db, Post, User, Comment } from 'astro:db'
import { eq, desc, sql } from 'astro:db'
import Layout from '#layouts/Layout.astro'
import BlogPosts from '#components/astro/BlogPosts.astro'

// Get posts with additional metadata
const posts = await db
  .select({
    id: Post.id,
    data: {
      title: Post.title,
      description: Post.excerpt,
      pubDate: Post.pubDate,
      author: Post.author,
      tags: Post.tags,
      featured: Post.featured,
      image: Post.image,
    },
    slug: Post.slug,
    body: Post.content,
    // Additional DB-specific fields
    viewCount: Post.viewCount,
    commentCount: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} 
      WHERE ${Comment.postId} = ${Post.id} 
      AND ${Comment.approved} = true
    )`.as('commentCount'),
  })
  .from(Post)
  .where(eq(Post.published, true))
  .orderBy(desc(Post.pubDate))
  .all()

// Transform to match existing component interface
const formattedPosts = posts.map(post => ({
  ...post,
  data: {
    ...post.data,
    tags: post.data.tags ? JSON.parse(post.data.tags) : [],
  },
}))
---

<Layout title="Blog">
  <BlogPosts posts={formattedPosts} />

  <!-- Add view statistics -->
  <aside class="stats">
    <p>Total posts: {posts.length}</p>
    <p>Total views: {posts.reduce((sum, post) => sum + post.viewCount, 0)}</p>
    <p>Total comments: {posts.reduce((sum, post) => sum + post.commentCount, 0)}</p>
  </aside>
</Layout>

<style>
  .stats {
    margin-top: 2rem;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
    text-align: center;
  }
</style>
```

### Convert Single Post Page

#### Original (Content Collections)

```astro
---
// src/pages/posts/[...slug].astro (original)
import { getCollection } from 'astro:content'
import MarkdownPostLayout from '#layouts/MarkdownPostLayout.astro'

export async function getStaticPaths() {
  const posts = await getCollection('posts')
  return posts.map(post => ({
    params: { slug: post.slug },
    props: post,
  }))
}

const post = Astro.props
const { Content } = await post.render()
---

<MarkdownPostLayout {...post.data}>
  <Content />
</MarkdownPostLayout>
```

#### Updated (Database with Dynamic Routes)

```astro
---
// src/pages/posts/[...slug].astro (database version)
import { db, Post, Comment, Analytics } from 'astro:db'
import { eq, and, desc } from 'astro:db'
import MarkdownPostLayout from '#layouts/MarkdownPostLayout.astro'
import Comment from '#components/astro/Comment.astro'

const { slug } = Astro.params

// Get post with author info
const post = await db.select().from(Post).where(eq(Post.slug, slug)).get()

if (!post) {
  return Astro.redirect('/404')
}

// Track page view
await db
  .update(Post)
  .set({ viewCount: post.viewCount + 1 })
  .where(eq(Post.id, post.id))

// Update analytics
const analyticsPath = Astro.url.pathname
const analytics = await db.select().from(Analytics).where(eq(Analytics.path, analyticsPath)).get()

if (analytics) {
  await db
    .update(Analytics)
    .set({
      views: analytics.views + 1,
      lastViewed: new Date(),
    })
    .where(eq(Analytics.id, analytics.id))
} else {
  await db.insert(Analytics).values({
    path: analyticsPath,
    title: post.title,
    views: 1,
    uniqueViews: 1,
  })
}

// Get approved comments
const comments = await db
  .select()
  .from(Comment)
  .where(and(eq(Comment.postId, post.id), eq(Comment.approved, true)))
  .orderBy(desc(Comment.createdAt))
  .all()

// Parse tags
const tags = post.tags ? JSON.parse(post.tags) : []

// Get related posts
const relatedPosts = await db
  .select()
  .from(Post)
  .where(
    and(eq(Post.published, true), ne(Post.id, post.id), sql`${Post.tags} LIKE ${`%"${tags[0]}"%`}`)
  )
  .limit(3)
  .all()
---

<MarkdownPostLayout
  title={post.title}
  description={post.excerpt}
  pubDate={post.pubDate}
  updatedDate={post.updatedDate}
  author={post.author}
  tags={tags}
  image={post.image}
  imageAlt={post.imageAlt}
>
  <!-- Render markdown content -->
  <div set:html={post.content} />

  <!-- Post metadata -->
  <div class="post-meta">
    <p>{post.viewCount} views</p>
    <p>{comments.length} comments</p>
  </div>

  <!-- Comments section -->
  <section class="comments">
    <h2>Comments</h2>
    {
      comments.length > 0 ? (
        comments.map(comment => <Comment comment={comment} />)
      ) : (
        <p>No comments yet. Be the first to comment!</p>
      )
    }
  </section>

  <!-- Related posts -->
  {
    relatedPosts.length > 0 && (
      <section class="related">
        <h2>Related Posts</h2>
        <ul>
          {relatedPosts.map(related => (
            <li>
              <a href={`/posts/${related.slug}`}>{related.title}</a>
            </li>
          ))}
        </ul>
      </section>
    )
  }
</MarkdownPostLayout>

<style>
  .post-meta {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }

  .comments {
    margin-top: 3rem;
    padding-top: 3rem;
    border-top: 1px solid var(--color-border);
  }

  .related {
    margin-top: 3rem;
    padding: 2rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }
</style>
```

## Building New Features

### Admin Dashboard

```astro
---
// src/pages/admin/posts.astro
import { db, Post, User, Comment } from 'astro:db'
import { desc, sql } from 'astro:db'
import Layout from '#layouts/Layout.astro'

// Check authentication (integrate with Clerk)
const user = Astro.locals.user
if (!user || !user.isAdmin) {
  return Astro.redirect('/login')
}

// Get posts with statistics
const posts = await db
  .select({
    id: Post.id,
    title: Post.title,
    slug: Post.slug,
    author: Post.author,
    published: Post.published,
    featured: Post.featured,
    pubDate: Post.pubDate,
    viewCount: Post.viewCount,
    commentCount: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} 
      WHERE ${Comment.postId} = ${Post.id}
    )`.as('commentCount'),
    pendingComments: sql`(
      SELECT COUNT(*) 
      FROM ${Comment} 
      WHERE ${Comment.postId} = ${Post.id} 
      AND ${Comment.approved} = false
    )`.as('pendingComments'),
  })
  .from(Post)
  .orderBy(desc(Post.createdAt))
  .all()

// Get statistics
const stats = await db
  .select({
    totalPosts: sql`COUNT(*)`.as('totalPosts'),
    publishedPosts: sql`COUNT(CASE WHEN ${Post.published} = true THEN 1 END)`.as('publishedPosts'),
    totalViews: sql`SUM(${Post.viewCount})`.as('totalViews'),
    totalComments: sql`(SELECT COUNT(*) FROM ${Comment})`.as('totalComments'),
    pendingComments: sql`(SELECT COUNT(*) FROM ${Comment} WHERE ${Comment.approved} = false)`.as(
      'pendingComments'
    ),
  })
  .from(Post)
  .get()
---

<Layout title="Admin - Posts">
  <h1>Post Management</h1>

  <!-- Statistics -->
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Total Posts</h3>
      <p class="stat-value">{stats.totalPosts}</p>
    </div>
    <div class="stat-card">
      <h3>Published</h3>
      <p class="stat-value">{stats.publishedPosts}</p>
    </div>
    <div class="stat-card">
      <h3>Total Views</h3>
      <p class="stat-value">{stats.totalViews}</p>
    </div>
    <div class="stat-card">
      <h3>Pending Comments</h3>
      <p class="stat-value">{stats.pendingComments}</p>
    </div>
  </div>

  <!-- Posts table -->
  <table class="posts-table">
    <thead>
      <tr>
        <th>Title</th>
        <th>Author</th>
        <th>Status</th>
        <th>Views</th>
        <th>Comments</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {
        posts.map(post => (
          <tr>
            <td>
              <a href={`/posts/${post.slug}`}>{post.title}</a>
              {post.featured && <span class="badge featured">Featured</span>}
            </td>
            <td>{post.author}</td>
            <td>
              <span class={`status ${post.published ? 'published' : 'draft'}`}>
                {post.published ? 'Published' : 'Draft'}
              </span>
            </td>
            <td>{post.viewCount}</td>
            <td>
              {post.commentCount}
              {post.pendingComments > 0 && (
                <span class="badge pending">{post.pendingComments} pending</span>
              )}
            </td>
            <td>
              <a href={`/admin/posts/${post.id}/edit`}>Edit</a>
              <button data-delete-id={post.id}>Delete</button>
            </td>
          </tr>
        ))
      }
    </tbody>
  </table>
</Layout>

<style>
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-primary);
  }

  .posts-table {
    width: 100%;
    border-collapse: collapse;
  }

  .posts-table th,
  .posts-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-left: 0.5rem;
  }

  .badge.featured {
    background: var(--color-accent);
    color: white;
  }

  .badge.pending {
    background: var(--color-warning);
    color: white;
  }

  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .status.published {
    background: var(--color-success-bg);
    color: var(--color-success);
  }

  .status.draft {
    background: var(--color-muted-bg);
    color: var(--color-muted);
  }
</style>

<script>
  // Handle delete buttons
  document.querySelectorAll('[data-delete-id]').forEach(button => {
    button.addEventListener('click', async e => {
      const id = e.target.dataset.deleteId
      if (confirm('Are you sure you want to delete this post?')) {
        try {
          const response = await fetch(`/api/posts/${id}`, {
            method: 'DELETE',
          })
          if (response.ok) {
            window.location.reload()
          }
        } catch (error) {
          console.error('Delete failed:', error)
        }
      }
    })
  })
</script>
```

### Search Page with Filters

```astro
---
// src/pages/search.astro
import { db, Post } from 'astro:db'
import { and, or, like, eq, desc, sql } from 'astro:db'
import Layout from '#layouts/Layout.astro'

const url = new URL(Astro.request.url)
const query = url.searchParams.get('q') || ''
const tag = url.searchParams.get('tag') || ''
const author = url.searchParams.get('author') || ''
const sort = url.searchParams.get('sort') || 'date'

// Build search conditions
const conditions = [eq(Post.published, true)]

if (query) {
  conditions.push(
    or(
      like(Post.title, `%${query}%`),
      like(Post.content, `%${query}%`),
      like(Post.excerpt, `%${query}%`)
    )
  )
}

if (tag) {
  conditions.push(sql`${Post.tags} LIKE ${`%"${tag}"%`}`)
}

if (author) {
  conditions.push(eq(Post.author, author))
}

// Apply sorting
let orderBy = desc(Post.pubDate)
if (sort === 'views') orderBy = desc(Post.viewCount)
if (sort === 'title') orderBy = asc(Post.title)

// Execute search
const results = await db
  .select()
  .from(Post)
  .where(and(...conditions))
  .orderBy(orderBy)
  .all()

// Get unique tags and authors for filters
const allTags = await db
  .select({ tags: Post.tags })
  .from(Post)
  .where(eq(Post.published, true))
  .all()

const uniqueTags = [
  ...new Set(allTags.flatMap(post => (post.tags ? JSON.parse(post.tags) : []))),
].sort()

const uniqueAuthors = await db
  .selectDistinct({ author: Post.author })
  .from(Post)
  .where(eq(Post.published, true))
  .all()
---

<Layout title="Search">
  <h1>Search Posts</h1>

  <!-- Search form -->
  <form class="search-form" method="get">
    <input
      type="search"
      name="q"
      value={query}
      placeholder="Search posts..."
      class="search-input"
    />

    <div class="filters">
      <select name="tag" class="filter-select">
        <option value="">All Tags</option>
        {
          uniqueTags.map(t => (
            <option value={t} selected={t === tag}>
              {t}
            </option>
          ))
        }
      </select>

      <select name="author" class="filter-select">
        <option value="">All Authors</option>
        {
          uniqueAuthors.map(a => (
            <option value={a.author} selected={a.author === author}>
              {a.author}
            </option>
          ))
        }
      </select>

      <select name="sort" class="filter-select">
        <option value="date" selected={sort === 'date'}>Newest First</option>
        <option value="views" selected={sort === 'views'}>Most Viewed</option>
        <option value="title" selected={sort === 'title'}>Alphabetical</option>
      </select>
    </div>

    <button type="submit" class="search-button">Search</button>
  </form>

  <!-- Results -->
  <div class="results">
    <p class="result-count">
      Found {results.length}
      {results.length === 1 ? 'result' : 'results'}
      {query && ` for "${query}"`}
    </p>

    {
      results.length > 0 ? (
        <div class="results-grid">
          {results.map(post => (
            <article class="result-card">
              <h2>
                <a href={`/posts/${post.slug}`}>{post.title}</a>
              </h2>
              <p class="result-excerpt">{post.excerpt}</p>
              <div class="result-meta">
                <span>{post.author}</span>
                <span>{post.pubDate.toLocaleDateString()}</span>
                <span>{post.viewCount} views</span>
              </div>
              {post.tags && (
                <div class="result-tags">
                  {JSON.parse(post.tags).map(t => (
                    <a href={`/search?tag=${t}`} class="tag">
                      {t}
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p class="no-results">No posts found. Try different search terms.</p>
      )
    }
  </div>
</Layout>

<style>
  .search-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 2rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }

  .search-input {
    padding: 0.75rem;
    font-size: 1.1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
  }

  .filters {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    background: white;
  }

  .search-button {
    padding: 0.75rem 2rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    align-self: flex-start;
  }

  .result-count {
    margin-bottom: 1rem;
    color: var(--color-text-secondary);
  }

  .results-grid {
    display: grid;
    gap: 1.5rem;
  }

  .result-card {
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }

  .result-excerpt {
    margin: 0.5rem 0;
    color: var(--color-text-secondary);
  }

  .result-meta {
    display: flex;
    gap: 1rem;
    margin: 0.5rem 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .result-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .tag {
    padding: 0.25rem 0.75rem;
    background: var(--color-bg-tertiary);
    border-radius: 9999px;
    font-size: 0.875rem;
    text-decoration: none;
    color: inherit;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-secondary);
  }
</style>
```

## Component Integration

### Comment Component

```astro
---
// src/components/astro/Comment.astro
export interface Props {
  comment: {
    id: number
    content: string
    author: string
    website?: string
    createdAt: Date
    parentId?: number
  }
  depth?: number
  postId: number
}

import { db, Comment } from 'astro:db'
import { eq, and } from 'astro:db'

const { comment, depth = 0, postId } = Astro.props

// Get replies
const replies = await db
  .select()
  .from(Comment)
  .where(and(eq(Comment.parentId, comment.id), eq(Comment.approved, true)))
  .orderBy(asc(Comment.createdAt))
  .all()
---

<article class={`comment depth-${depth}`}>
  <header class="comment-header">
    <strong class="comment-author">
      {
        comment.website ? (
          <a href={comment.website} rel="nofollow">
            {comment.author}
          </a>
        ) : (
          comment.author
        )
      }
    </strong>
    <time class="comment-date">
      {comment.createdAt.toLocaleString()}
    </time>
  </header>

  <div class="comment-content">
    {comment.content}
  </div>

  <footer class="comment-footer">
    <button class="reply-button" data-comment-id={comment.id} data-post-id={postId}> Reply </button>
  </footer>

  {
    replies.length > 0 && (
      <div class="replies">
        {replies.map(reply => (
          <Astro.self comment={reply} depth={depth + 1} postId={postId} />
        ))}
      </div>
    )
  }
</article>

<style>
  .comment {
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
    border-left: 3px solid var(--color-border);
  }

  .comment.depth-1 {
    margin-left: 2rem;
    background: var(--color-bg-tertiary);
  }

  .comment.depth-2 {
    margin-left: 4rem;
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .comment-author {
    color: var(--color-primary);
  }

  .comment-date {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .comment-content {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .reply-button {
    padding: 0.25rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .replies {
    margin-top: 1rem;
  }
</style>
```

### Popular Posts Widget

```astro
---
// src/components/astro/PopularPosts.astro
export interface Props {
  limit?: number
  excludeId?: number
}

import { db, Post } from 'astro:db'
import { eq, desc, ne, and } from 'astro:db'

const { limit = 5, excludeId } = Astro.props

const conditions = [eq(Post.published, true)]
if (excludeId) {
  conditions.push(ne(Post.id, excludeId))
}

const popularPosts = await db
  .select({
    id: Post.id,
    title: Post.title,
    slug: Post.slug,
    viewCount: Post.viewCount,
    excerpt: Post.excerpt,
  })
  .from(Post)
  .where(and(...conditions))
  .orderBy(desc(Post.viewCount))
  .limit(limit)
  .all()
---

<aside class="popular-posts">
  <h3>Popular Posts</h3>
  <ol class="popular-list">
    {
      popularPosts.map((post, index) => (
        <li class="popular-item">
          <span class="rank">{index + 1}</span>
          <div class="post-info">
            <a href={`/posts/${post.slug}`} class="post-title">
              {post.title}
            </a>
            <span class="view-count">{post.viewCount} views</span>
          </div>
        </li>
      ))
    }
  </ol>
</aside>

<style>
  .popular-posts {
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }

  .popular-posts h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .popular-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .popular-item {
    display: flex;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .popular-item:last-child {
    border-bottom: none;
  }

  .rank {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    font-weight: bold;
    font-size: 0.875rem;
  }

  .post-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .post-title {
    color: inherit;
    text-decoration: none;
    font-weight: 500;
  }

  .post-title:hover {
    color: var(--color-primary);
  }

  .view-count {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>
```

## Advanced Implementations

### Real-time View Counter

```astro
---
// src/components/astro/ViewCounter.astro
export interface Props {
  postId: number
  initialCount: number
}

const { postId, initialCount } = Astro.props
---

<div class="view-counter" data-post-id={postId}>
  <span class="view-count">{initialCount}</span>
  <span class="view-label">views</span>
</div>

<script>
  // Update view count in real-time
  const counters = document.querySelectorAll('.view-counter')

  counters.forEach(counter => {
    const postId = counter.dataset.postId
    const countElement = counter.querySelector('.view-count')

    // Poll for updates every 30 seconds
    setInterval(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/views`)
        const data = await response.json()
        countElement.textContent = data.viewCount
      } catch (error) {
        console.error('Failed to update view count:', error)
      }
    }, 30000)
  })
</script>

<style>
  .view-counter {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background: var(--color-bg-secondary);
    border-radius: 9999px;
    font-size: 0.875rem;
  }

  .view-count {
    font-weight: bold;
    color: var(--color-primary);
  }

  .view-label {
    color: var(--color-text-secondary);
  }
</style>
```

### Newsletter Signup Form

```astro
---
// src/components/astro/NewsletterForm.astro
---

<form class="newsletter-form" method="post" action="/api/newsletter/subscribe">
  <h3>Subscribe to Newsletter</h3>
  <p>Get the latest posts delivered to your inbox</p>

  <div class="form-group">
    <input type="email" name="email" placeholder="your@email.com" required class="form-input" />
    <input type="text" name="name" placeholder="Your name (optional)" class="form-input" />
  </div>

  <button type="submit" class="submit-button"> Subscribe </button>

  <p class="form-note">We respect your privacy. Unsubscribe at any time.</p>
</form>

<script>
  const form = document.querySelector('.newsletter-form')

  form?.addEventListener('submit', async e => {
    e.preventDefault()

    const formData = new FormData(form)
    const button = form.querySelector('.submit-button')

    button.disabled = true
    button.textContent = 'Subscribing...'

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData)),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        form.innerHTML = `
          <div class="success-message">
            <h3>Thanks for subscribing!</h3>
            <p>Please check your email to confirm your subscription.</p>
          </div>
        `
      } else {
        throw new Error(data.error || 'Subscription failed')
      }
    } catch (error) {
      button.disabled = false
      button.textContent = 'Subscribe'
      alert(error.message)
    }
  })
</script>

<style>
  .newsletter-form {
    padding: 2rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
    text-align: center;
  }

  .newsletter-form h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .newsletter-form p {
    margin-bottom: 1.5rem;
    color: var(--color-text-secondary);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .form-input {
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    font-size: 1rem;
  }

  .submit-button {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  .submit-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .form-note {
    margin-top: 1rem;
    margin-bottom: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .success-message {
    padding: 2rem;
    text-align: center;
  }

  .success-message h3 {
    color: var(--color-success);
    margin-bottom: 0.5rem;
  }
</style>
```

### Analytics Dashboard Component

```astro
---
// src/components/dashboard/AnalyticsDashboard.astro
import { db, Analytics, Post } from 'astro:db'
import { desc, sql } from 'astro:db'

// Get top pages
const topPages = await db.select().from(Analytics).orderBy(desc(Analytics.views)).limit(10).all()

// Get recent page views
const recentViews = await db
  .select()
  .from(Analytics)
  .orderBy(desc(Analytics.lastViewed))
  .limit(20)
  .all()

// Get statistics
const stats = await db
  .select({
    totalPageViews: sql`SUM(${Analytics.views})`.as('totalPageViews'),
    uniquePages: sql`COUNT(DISTINCT ${Analytics.path})`.as('uniquePages'),
    avgViewsPerPage: sql`AVG(${Analytics.views})`.as('avgViewsPerPage'),
    todayViews: sql`
      SUM(CASE 
        WHEN date(${Analytics.lastViewed}) = date('now') 
        THEN ${Analytics.views} 
        ELSE 0 
      END)
    `.as('todayViews'),
  })
  .from(Analytics)
  .get()

// Get views over time (last 7 days)
const viewsOverTime = await db
  .select({
    date: sql`date(${Analytics.lastViewed})`.as('date'),
    views: sql`SUM(${Analytics.views})`.as('views'),
  })
  .from(Analytics)
  .where(sql`${Analytics.lastViewed} >= datetime('now', '-7 days')`)
  .groupBy(sql`date(${Analytics.lastViewed})`)
  .orderBy(sql`date(${Analytics.lastViewed})`)
  .all()
---

<div class="analytics-dashboard">
  <h2>Analytics Overview</h2>

  <!-- Statistics Cards -->
  <div class="stats-grid">
    <div class="stat-card">
      <h3>Total Page Views</h3>
      <p class="stat-value">{stats.totalPageViews || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Unique Pages</h3>
      <p class="stat-value">{stats.uniquePages || 0}</p>
    </div>
    <div class="stat-card">
      <h3>Avg Views/Page</h3>
      <p class="stat-value">{Math.round(stats.avgViewsPerPage || 0)}</p>
    </div>
    <div class="stat-card">
      <h3>Today's Views</h3>
      <p class="stat-value">{stats.todayViews || 0}</p>
    </div>
  </div>

  <!-- Views Chart -->
  <div class="chart-container">
    <h3>Views Over Time (Last 7 Days)</h3>
    <canvas id="viewsChart"></canvas>
  </div>

  <!-- Top Pages -->
  <div class="top-pages">
    <h3>Top Pages</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Page</th>
          <th>Views</th>
          <th>Last Viewed</th>
        </tr>
      </thead>
      <tbody>
        {
          topPages.map(page => (
            <tr>
              <td>
                <a href={page.path}>{page.title || page.path}</a>
              </td>
              <td>{page.views}</td>
              <td>{page.lastViewed.toLocaleString()}</td>
            </tr>
          ))
        }
      </tbody>
    </table>
  </div>
</div>

<script define:vars={{ viewsOverTime }}>
  // Simple chart rendering
  const canvas = document.getElementById('viewsChart')
  const ctx = canvas.getContext('2d')

  // Set canvas size
  canvas.width = canvas.offsetWidth
  canvas.height = 200

  // Prepare data
  const data = viewsOverTime || []
  const maxViews = Math.max(...data.map(d => d.views), 1)
  const barWidth = canvas.width / data.length

  // Draw bars
  data.forEach((day, index) => {
    const barHeight = (day.views / maxViews) * 150
    const x = index * barWidth
    const y = canvas.height - barHeight - 30

    // Draw bar
    ctx.fillStyle = '#0066cc'
    ctx.fillRect(x + 10, y, barWidth - 20, barHeight)

    // Draw label
    ctx.fillStyle = '#666'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
      x + barWidth / 2,
      canvas.height - 10
    )

    // Draw value
    ctx.fillText(day.views.toString(), x + barWidth / 2, y - 5)
  })
</script>

<style>
  .analytics-dashboard {
    padding: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
    text-align: center;
  }

  .stat-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .stat-value {
    margin: 0;
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-primary);
  }

  .chart-container {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--color-bg-secondary);
    border-radius: 0.5rem;
  }

  .chart-container h3 {
    margin-top: 0;
  }

  #viewsChart {
    width: 100%;
    height: 200px;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
  }

  .data-table th,
  .data-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
  }

  .data-table th {
    font-weight: 600;
    background: var(--color-bg-secondary);
  }
</style>
```

## Integration Tips

1. **Gradual Migration**: Start by adding database features alongside existing content collections
2. **Type Safety**: Always define proper TypeScript types for query results
3. **Performance**: Use indexes and limit queries to improve speed
4. **Caching**: Implement caching for expensive queries
5. **Error Handling**: Always wrap database operations in try-catch blocks
6. **Testing**: Create test data that mirrors production structure
