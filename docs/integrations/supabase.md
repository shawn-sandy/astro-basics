# Supabase Integration Guide

This guide covers integrating Supabase into your Astro project for database functionality, authentication, and real-time features.

## Overview

Supabase is an open-source Firebase alternative that provides:

- PostgreSQL database with real-time subscriptions
- Authentication and authorization
- Auto-generated APIs
- Storage for files and media
- Edge functions

## Prerequisites

- Supabase account ([Supabase](https://supabase.com))
- Existing Astro project
- Node.js 18+ installed

## Installation

Install the Supabase JavaScript client:

```bash
npm install @supabase/supabase-js
```

For TypeScript support, also install:

```bash
npm install -D supabase
```

## Environment Setup

### 1. Create Supabase Project

1. Go to [Supabase dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization
4. Set project name and database password
5. Select region closest to your users
6. Wait for project initialization (2-3 minutes)

### 2. Get Project Credentials

From your Supabase dashboard:

1. Go to Settings → API
2. Copy your project URL and anon key

### 3. Environment Variables

Add to your `.env` file:

```env
# Supabase Configuration
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Security Note**: Only the public keys should be prefixed with `PUBLIC_`. The service role key should remain private.

## Basic Setup

### 1. Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 2. Server-Side Client (Optional)

For server-side operations, create `src/lib/supabase-server.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
```

## Database Integration

### 1. Schema Design

Create tables in Supabase SQL Editor or via CLI:

```sql
-- Example: Blog posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  slug TEXT UNIQUE NOT NULL,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  author_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Posts are viewable by everyone" ON posts
  FOR SELECT USING (published = true);

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);
```

### 2. Type Generation

Generate TypeScript types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

### 3. Typed Client

Update `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '#/types/database.types'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

## Data Fetching Patterns

### 1. Server-Side Fetching (SSR)

```astro
---
// src/pages/posts/[slug].astro
import { supabaseServer } from '#/lib/supabase-server'

export async function getStaticPaths() {
  const { data: posts } = await supabaseServer.from('posts').select('slug').eq('published', true)

  return (
    posts?.map(({ slug }) => ({
      params: { slug },
    })) || []
  )
}

const { slug } = Astro.params

const { data: post, error } = await supabaseServer
  .from('posts')
  .select('*')
  .eq('slug', slug)
  .eq('published', true)
  .single()

if (error || !post) {
  return Astro.redirect('/404')
}
---

<html>
  <head>
    <title>{post.title}</title>
  </head>
  <body>
    <h1>{post.title}</h1>
    <div set:html={post.content} />
  </body>
</html>
```

### 2. Client-Side Fetching

```typescript
// src/utils/posts.ts
import { supabase } from '#/lib/supabase'

export async function getPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPost(post: Partial<Post>) {
  const { data, error } = await supabase.from('posts').insert(post).select().single()

  if (error) throw error
  return data
}
```

## Authentication Integration

### 1. Auth Configuration

Since you're already using Clerk, you might want to choose between Clerk and Supabase Auth or use them together:

**Option A: Replace Clerk with Supabase Auth**

```typescript
// src/lib/auth.ts
import { supabase } from '#/lib/supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}
```

**Option B: Use Supabase with Clerk (Custom JWT)**

Configure Supabase to accept Clerk JWTs by setting up custom claims in your Supabase project.

### 2. Auth Components

```astro
---
// src/components/AuthForm.astro
---

<form id="auth-form">
  <input type="email" name="email" placeholder="Email" required />
  <input type="password" name="password" placeholder="Password" required />
  <button type="submit">Sign In</button>
</form>

<script>
  import { supabase } from '#/lib/supabase'

  const form = document.getElementById('auth-form') as HTMLFormElement

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Auth error:', error)
    } else {
      window.location.href = '/dashboard'
    }
  })
</script>
```

## Real-time Features

### 1. Real-time Subscriptions

```typescript
// src/utils/realtime.ts
import { supabase } from '#/lib/supabase'

export function subscribeToPostChanges(callback: (payload: any) => void) {
  return supabase
    .channel('posts-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'posts',
      },
      callback
    )
    .subscribe()
}

// Usage in component
const channel = subscribeToPostChanges(payload => {
  console.log('Post changed:', payload)
  // Update UI accordingly
})

// Cleanup
channel.unsubscribe()
```

### 2. React Component with Real-time

```tsx
// src/components/react/PostsList.tsx
import { useEffect, useState } from 'react'
import { supabase } from '#/lib/supabase'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
}

export function PostsList() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    // Initial load
    loadPosts()

    // Subscribe to changes
    const channel = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  async function loadPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (data) setPosts(data)
  }

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  )
}
```

## Storage Integration

### 1. File Upload

```typescript
// src/utils/storage.ts
import { supabase } from '#/lib/supabase'

export async function uploadFile(
  bucket: string,
  file: File,
  path?: string
): Promise<string | null> {
  const filePath = path || `${Date.now()}-${file.name}`

  const { error } = await supabase.storage.from(bucket).upload(filePath, file)

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)

  return data.publicUrl
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path])

  return { error }
}
```

### 2. Image Upload Component

```tsx
// src/components/react/ImageUpload.tsx
import { useState } from 'react'
import { uploadFile } from '#/utils/storage'

export function ImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const url = await uploadFile('images', file)
    setImageUrl(url)
    setUploading(false)
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  )
}
```

## Migration from Existing Content

### 1. Content Collections to Supabase

```typescript
// scripts/migrate-content.ts
import { getCollection } from 'astro:content'
import { supabaseServer } from '../src/lib/supabase-server'

async function migrateContent() {
  const posts = await getCollection('posts')

  for (const post of posts) {
    const { error } = await supabaseServer.from('posts').insert({
      title: post.data.title,
      content: post.body,
      slug: post.slug,
      published: post.data.featured || false,
      created_at: post.data.pubDate,
    })

    if (error) {
      console.error(`Error migrating ${post.slug}:`, error)
    } else {
      console.log(`Migrated ${post.slug}`)
    }
  }
}

migrateContent()
```

Run migration:

```bash
npx tsx scripts/migrate-content.ts
```

## Best Practices

### 1. Error Handling

```typescript
// src/utils/error-handler.ts
export function handleSupabaseError(error: any) {
  if (error?.code === 'PGRST301') {
    return 'Resource not found'
  }
  if (error?.code === '23505') {
    return 'This item already exists'
  }
  return error?.message || 'An unexpected error occurred'
}
```

### 2. Data Validation

```typescript
// src/utils/validation.ts
import { z } from 'zod'

export const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  published: z.boolean().default(false),
})

export type PostInput = z.infer<typeof PostSchema>
```

### 3. Connection Pooling

For high-traffic applications, consider using connection pooling:

```typescript
// src/lib/supabase-pooled.ts
import { createClient } from '@supabase/supabase-js'

export const supabasePooled = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { 'x-application-name': 'astro-kit' },
    },
  }
)
```

## Testing

### 1. Test Setup

```typescript
// src/test/setup.ts
import { beforeEach } from 'vitest'
import { supabaseServer } from '#/lib/supabase-server'

beforeEach(async () => {
  // Clean up test data
  await supabaseServer.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
})
```

### 2. Integration Tests

```typescript
// src/test/posts.test.ts
import { describe, it, expect } from 'vitest'
import { createPost, getPosts } from '#/utils/posts'

describe('Posts', () => {
  it('should create and retrieve posts', async () => {
    const newPost = {
      title: 'Test Post',
      content: 'Test content',
      slug: 'test-post',
      published: true,
    }

    const created = await createPost(newPost)
    expect(created.title).toBe(newPost.title)

    const posts = await getPosts()
    expect(posts.some(p => p.id === created.id)).toBe(true)
  })
})
```

## Deployment Considerations

### 1. Environment Variables

Ensure all required environment variables are set in your deployment platform:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Database Migrations

Use Supabase CLI for managing database schema changes:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Create migration
supabase db diff --schema public --file migration_name

# Apply migrations
supabase db push
```

### 3. Security Checklist

- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Create appropriate security policies
- ✅ Use service role key only on server-side
- ✅ Validate all user inputs
- ✅ Implement proper error handling
- ✅ Use HTTPS in production
- ✅ Regularly rotate API keys

## Troubleshooting

### Common Issues

1. **Connection Errors**

   - Verify environment variables
   - Check Supabase project status
   - Ensure API keys are correct

2. **Permission Denied**

   - Review RLS policies
   - Check user authentication status
   - Verify table permissions

3. **Type Errors**

   - Regenerate types: `npx supabase gen types typescript`
   - Update import paths
   - Check schema changes

4. **Real-time Not Working**
   - Enable real-time in Supabase dashboard
   - Check subscription setup
   - Verify channel configuration

### Debugging

Enable detailed logging:

```typescript
// src/lib/supabase-debug.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseDebug = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public',
    },
    auth: {
      debug: true,
    },
    global: {
      headers: { 'x-application-name': 'astro-kit-debug' },
    },
  }
)
```

## Next Steps

1. Set up your Supabase project and configure environment variables
2. Create your database schema and policies
3. Implement basic CRUD operations
4. Add authentication (choose between Clerk or Supabase Auth)
5. Implement real-time features as needed
6. Set up proper testing and deployment pipelines

For more advanced features, consider:

- Edge functions for custom business logic
- PostgREST API customization
- Advanced real-time features
- Integration with other Supabase features (auth, storage, edge functions)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Astro Supabase Tutorial](https://docs.astro.build/en/guides/backend/supabase/)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
