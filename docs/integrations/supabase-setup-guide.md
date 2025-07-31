# Supabase Integration Setup Guide

This guide covers the complete setup and next steps for integrating Supabase with the astro-basics project.

## Current Setup Status

✅ **Completed:**

- Supabase JavaScript client installed (`@supabase/supabase-js`)
- Environment variables configured in `.env.example`
- Supabase client configuration created (`src/libs/supabase.ts`)
- API endpoint for testing connection (`src/pages/api/supabase-test.ts`)
- Interactive test page (`src/pages/supabase-test.astro`)

## Next Steps Implementation

### 1. Database Schema Design

#### 1.1 Plan Your Database Structure

Before creating tables, design your database schema based on your application needs:

```sql
-- Example: Blog/Content Management Schema
-- Users table (if using Supabase Auth instead of Clerk)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post tags junction table
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 1.2 Create Tables in Supabase Dashboard

1. **Navigate to Supabase Dashboard** → Your Project → SQL Editor
2. **Run the schema SQL** to create your tables
3. **Add indexes** for better performance:

```sql
-- Add indexes for better query performance
CREATE INDEX idx_posts_published ON posts(published);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_approved ON comments(approved);
```

### 2. Row Level Security (RLS) Configuration

#### 2.1 Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

#### 2.2 Create Security Policies

```sql
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Published posts are viewable by everyone" ON posts
  FOR SELECT USING (published = true);

CREATE POLICY "Authors can view own posts" ON posts
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authors can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

-- Tags policies (public read, admin write)
CREATE POLICY "Tags are viewable by everyone" ON tags
  FOR SELECT USING (true);

-- Comments policies
CREATE POLICY "Approved comments are viewable by everyone" ON comments
  FOR SELECT USING (approved = true);

CREATE POLICY "Authors can view own comments" ON comments
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);
```

### 3. Authentication Strategy Decision

You have two main options for authentication:

#### Option A: Keep Clerk + Supabase Database Only

**Pros:**

- Leverage existing Clerk setup
- Use Supabase only for database operations
- Clerk's advanced auth features (social logins, user management)

**Implementation:**

```typescript
// src/libs/supabase-clerk.ts
import { createClient } from '@supabase/supabase-js'

// Create Supabase client without auth (use Clerk user ID)
export const supabaseWithClerk = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // Don't use Supabase auth
    },
  }
)

// Helper to get Clerk user in Supabase operations
export const getClerkUserId = async () => {
  // Get Clerk user ID from your Clerk integration
  // This will depend on your Clerk setup
}
```

#### Option B: Migrate to Supabase Auth

**Pros:**

- Single authentication system
- Native integration with RLS
- Built-in user management

**Implementation Steps:**

1. **Remove Clerk integration** from `astro.config.mjs`
2. **Update middleware** to use Supabase auth
3. **Create auth pages** for Supabase

### 4. TypeScript Type Generation

#### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

#### 4.2 Generate Types

```bash
# Generate TypeScript definitions
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts
```

#### 4.3 Update Supabase Client

```typescript
// src/libs/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '#types/database.types'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Export types for use in components
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
```

#### 4.4 Add Type Generation Script

Add to `package.json`:

```json
{
  "scripts": {
    "types:generate": "supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.types.ts"
  }
}
```

### 5. Real-time Features Implementation

#### 5.1 Real-time Comments Example

```typescript
// src/components/react/RealtimeComments.tsx
import { useEffect, useState } from 'react'
import { supabase } from '#libs/supabase'
import type { Tables } from '#libs/supabase'

type Comment = Tables<'comments'>

export function RealtimeComments({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([])

  useEffect(() => {
    // Fetch initial comments
    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .eq('approved', true)
        .order('created_at', { ascending: true })

      if (data) setComments(data)
    }

    fetchComments()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          console.log('Comment change received!', payload)
          fetchComments() // Refetch comments
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [postId])

  return (
    <div className="comments">
      {comments.map((comment) => (
        <div key={comment.id} className="comment">
          <p>{comment.content}</p>
          <small>{new Date(comment.created_at).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  )
}
```

### 6. Storage Integration

#### 6.1 Configure Storage Bucket

1. **Go to Supabase Dashboard** → Storage
2. **Create a new bucket** (e.g., 'uploads', 'avatars', 'post-images')
3. **Set bucket policies**:

```sql
-- Allow public read access for post images
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-images' AND
    auth.role() = 'authenticated'
  );
```

#### 6.2 File Upload Component

```typescript
// src/components/react/FileUpload.tsx
import { useState } from 'react'
import { supabase } from '#libs/supabase'

export function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select a file to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(filePath)

      setUrl(data.publicUrl)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error uploading file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={uploadFile}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {url && (
        <div>
          <p>Upload successful!</p>
          <img src={url} alt="Uploaded file" style={{ maxWidth: '200px' }} />
        </div>
      )}
    </div>
  )
}
```

### 7. Database Operations Examples

#### 7.1 Content Fetching (Posts)

```typescript
// src/utils/supabase-content.ts
import { supabase } from '#libs/supabase'
import type { Tables } from '#libs/supabase'

type Post = Tables<'posts'>

export const getPosts = async (limit = 10, offset = 0) => {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      profiles:author_id (
        full_name,
        avatar_url
      ),
      post_tags (
        tags (
          name,
          slug
        )
      )
    `
    )
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data
}

export const getPostBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      profiles:author_id (
        full_name,
        avatar_url
      ),
      post_tags (
        tags (
          name,
          slug
        )
      )
    `
    )
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) throw error
  return data
}
```

#### 7.2 Content Creation

```typescript
// src/utils/supabase-admin.ts
import { supabase } from '#libs/supabase'
import type { InsertDto } from '#libs/supabase'

export const createPost = async (postData: InsertDto<'posts'>) => {
  const { data, error } = await supabase.from('posts').insert(postData).select().single()

  if (error) throw error
  return data
}

export const updatePost = async (id: string, updates: Partial<InsertDto<'posts'>>) => {
  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
```

### 8. Deployment Configuration

#### 8.1 Environment Variables for Production

Ensure these are set in your deployment platform:

```bash
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### 8.2 Update Astro Config for Edge Functions (Optional)

If using Supabase Edge Functions:

```typescript
// astro.config.mjs - Add edge function support
export default defineConfig({
  // ... existing config
  vite: {
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
    },
  },
})
```

## Testing Your Integration

### 1. Basic Connection Test

Visit `/supabase-test` and use the test buttons to verify connectivity.

### 2. Database Operations Test

Create a simple test script:

```typescript
// src/scripts/test-db.ts
import { supabase } from '#libs/supabase'

async function testDatabase() {
  try {
    // Test insert
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert({
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is a test post',
        published: true,
      })
      .select()
      .single()

    if (insertError) throw insertError
    console.log('✅ Insert successful:', newPost)

    // Test select
    const { data: posts, error: selectError } = await supabase.from('posts').select('*').limit(5)

    if (selectError) throw selectError
    console.log('✅ Select successful:', posts)
  } catch (error) {
    console.error('❌ Database test failed:', error)
  }
}

testDatabase()
```

## Performance Considerations

### 1. Query Optimization

- Use `select()` to specify only needed columns
- Add proper indexes for frequently queried columns
- Use `range()` for pagination instead of `limit()`

### 2. Connection Pooling

For high-traffic applications, consider implementing connection pooling or using Supabase's built-in connection pooling.

### 3. Caching Strategy

Implement caching for frequently accessed data:

```typescript
// Example with simple in-memory cache
const cache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const getCachedPosts = async () => {
  const cacheKey = 'posts'
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }

  const posts = await getPosts()
  cache.set(cacheKey, { data: posts, timestamp: Date.now() })
  return posts
}
```

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify environment variables are correctly set
2. **RLS Errors**: Check your security policies match your auth setup
3. **Type Errors**: Regenerate types after schema changes
4. **Real-time Not Working**: Ensure your policies allow the operations

### Debug Mode

Enable debug logging:

```typescript
// src/libs/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: process.env.NODE_ENV === 'development',
  },
})
```

This completes the Supabase integration setup guide. Choose the features that best fit your application needs and implement them step by step.
