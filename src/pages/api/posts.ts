import type { APIRoute } from 'astro'
import { db, Post, Comment, Analytics } from 'astro:db'
import { eq, desc, and, like, sql } from 'astro:db'

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse query parameters
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const featured = url.searchParams.get('featured') === 'true'
    const search = url.searchParams.get('search') || ''
    const tag = url.searchParams.get('tag') || ''
    const author = url.searchParams.get('author') || ''

    // Build query conditions
    const conditions = [eq(Post.published, true)]

    if (featured) {
      conditions.push(eq(Post.featured, true))
    }

    if (search) {
      conditions.push(
        sql`${Post.title} LIKE ${`%${search}%`} OR ${Post.content} LIKE ${`%${search}%`}`
      )
    }

    if (tag) {
      conditions.push(sql`${Post.tags} LIKE ${`%"${tag}"%`}`)
    }

    if (author) {
      conditions.push(like(Post.author, `%${author}%`))
    }

    // Get posts with comment count
    const posts = await db
      .select({
        id: Post.id,
        title: Post.title,
        slug: Post.slug,
        excerpt: Post.excerpt,
        author: Post.author,
        tags: Post.tags,
        featured: Post.featured,
        pubDate: Post.pubDate,
        viewCount: Post.viewCount,
        commentCount:
          sql`(SELECT COUNT(*) FROM ${Comment} WHERE ${Comment.postId} = ${Post.id} AND ${Comment.approved} = true)`.as(
            'commentCount'
          ),
      })
      .from(Post)
      .where(and(...conditions))
      .orderBy(desc(Post.pubDate))
      .limit(limit)
      .offset(offset)
      .all()

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql`COUNT(*)`.as('count') })
      .from(Post)
      .where(and(...conditions))
      .get()

    const totalCount = totalCountResult?.count || 0

    return new Response(
      JSON.stringify({
        posts,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching posts:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.title || !data.slug || !data.content || !data.author) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if slug already exists
    const existingPost = await db.select().from(Post).where(eq(Post.slug, data.slug)).get()

    if (existingPost) {
      return new Response(JSON.stringify({ error: 'Post with this slug already exists' }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Insert new post
    const newPost = await db
      .insert(Post)
      .values({
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt || data.content.substring(0, 150) + '...',
        author: data.author,
        tags: JSON.stringify(data.tags || []),
        featured: data.featured || false,
        published: data.published || false,
        pubDate: data.pubDate ? new Date(data.pubDate) : new Date(),
        image: data.image,
        imageAlt: data.imageAlt,
        userId: data.userId,
      })
      .returning()
      .get()

    // Update analytics for new post
    if (newPost) {
      await db.insert(Analytics).values({
        path: `/blog/${newPost.slug}`,
        title: newPost.title,
      })
    }

    return new Response(JSON.stringify(newPost), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return new Response(JSON.stringify({ error: 'Failed to create post' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url)
    const postId = parseInt(url.pathname.split('/').pop() || '0')

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    const data = await request.json()

    // Check if post exists
    const existingPost = await db.select().from(Post).where(eq(Post.id, postId)).get()

    if (!existingPost) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Update post
    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags)
    if (data.featured !== undefined) updateData.featured = data.featured
    if (data.published !== undefined) updateData.published = data.published
    if (data.image !== undefined) updateData.image = data.image
    if (data.imageAlt !== undefined) updateData.imageAlt = data.imageAlt

    const updatedPost = await db
      .update(Post)
      .set(updateData)
      .where(eq(Post.id, postId))
      .returning()
      .get()

    return new Response(JSON.stringify(updatedPost), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error updating post:', error)
    return new Response(JSON.stringify({ error: 'Failed to update post' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url)
    // Extract post ID from path using regex: matches /api/posts/:id
    const match = url.pathname.match(/^\/api\/posts\/(\d+)(?:\/)?$/)
    const postId = match ? parseInt(match[1], 10) : 0

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Check if post exists
    const existingPost = await db.select().from(Post).where(eq(Post.id, postId)).get()

    if (!existingPost) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    // Delete associated comments first
    await db.delete(Comment).where(eq(Comment.postId, postId))

    // Delete the post
    await db.delete(Post).where(eq(Post.id, postId))

    return new Response(JSON.stringify({ message: 'Post deleted successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error deleting post:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete post' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
