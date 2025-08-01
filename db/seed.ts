import { db, User, Post, Comment, Analytics, ContactSubmission, Newsletter } from 'astro:db'

// https://astro.build/db/seed
export default async function seed() {
  // Seed users
  await db.insert(User).values([
    {
      id: 1,
      email: 'shawn@example.com',
      name: 'Shawn Sandy',
      avatar: '/avatars/shawn.jpg',
      bio: 'Full-stack developer and creator of Astro Basics',
    },
    {
      id: 2,
      email: 'demo@example.com',
      name: 'Demo User',
      bio: 'A demo user for testing purposes',
    },
    {
      id: 3,
      email: 'jane@example.com',
      name: 'Jane Developer',
      avatar: '/avatars/jane.jpg',
      bio: 'Frontend specialist with a passion for Astro',
    },
  ])

  // Seed posts
  await db.insert(Post).values([
    {
      id: 1,
      title: 'Getting Started with Astro DB',
      slug: 'getting-started-astro-db',
      content: `# Getting Started with Astro DB

Astro DB is a fully-managed SQL database designed for the Astro ecosystem. It provides a type-safe, easy-to-use database solution that integrates seamlessly with your Astro project.

## Key Features

- **Type Safety**: Full TypeScript support with auto-generated types
- **Local Development**: Built-in local database for development
- **Easy Deployment**: Push to production with a single command
- **SQL Power**: Built on LibSQL for powerful querying capabilities

## Installation

Getting started is as simple as running:

\`\`\`bash
npx astro add db
\`\`\`

This guide will walk you through everything you need to know to get started with Astro DB in your projects.`,
      excerpt:
        'Learn how to integrate Astro DB into your project for a fully-managed, type-safe database solution.',
      author: 'Shawn Sandy',
      tags: JSON.stringify(['astro', 'database', 'tutorial', 'astro-db']),
      featured: true,
      published: true,
      pubDate: new Date('2024-01-15'),
      userId: 1,
      viewCount: 156,
    },
    {
      id: 2,
      title: 'Building Reusable Astro Components',
      slug: 'building-reusable-astro-components',
      content: `# Building Reusable Astro Components

Creating reusable components is at the heart of modern web development. Astro makes this process intuitive and powerful.

## Component Architecture

Astro components combine the best of static site generation with dynamic capabilities:

- **Island Architecture**: Ship only the JavaScript you need
- **Framework Agnostic**: Use React, Vue, Svelte, or vanilla JS
- **Zero JS by Default**: Components are static unless you need interactivity

## Best Practices

1. Keep components focused and single-purpose
2. Use TypeScript for better developer experience
3. Document your component props
4. Leverage Astro's built-in optimizations

Start building better components today!`,
      excerpt:
        'Best practices for creating reusable, performant Astro components for your projects.',
      author: 'Jane Developer',
      tags: JSON.stringify(['astro', 'components', 'development', 'best-practices']),
      featured: false,
      published: true,
      pubDate: new Date('2024-01-20'),
      userId: 3,
      viewCount: 89,
    },
    {
      id: 3,
      title: 'Optimizing Performance in Astro',
      slug: 'optimizing-performance-astro',
      content: `# Optimizing Performance in Astro

Performance is a first-class citizen in Astro. Here's how to make your sites even faster.

## Image Optimization

Use Astro's built-in image optimization:

\`\`\`astro
---
import { Image } from 'astro:assets';
import myImage from '../assets/hero.jpg';
---

<Image src={myImage} alt="Hero image" />
\`\`\`

## Lazy Loading

Implement lazy loading for better performance:

\`\`\`astro
<Image loading="lazy" src={myImage} alt="Lazy loaded image" />
\`\`\`

## Bundle Optimization

- Use dynamic imports for large libraries
- Leverage Astro's automatic code splitting
- Minimize client-side JavaScript

Your users will thank you for the lightning-fast experience!`,
      excerpt: 'Tips and techniques for maximizing performance in your Astro applications.',
      author: 'Shawn Sandy',
      tags: JSON.stringify(['astro', 'performance', 'optimization', 'web-vitals']),
      featured: true,
      published: true,
      pubDate: new Date('2024-02-01'),
      userId: 1,
      viewCount: 234,
    },
    {
      id: 4,
      title: 'Integrating MDX with Astro',
      slug: 'integrating-mdx-astro',
      content: `# Integrating MDX with Astro

MDX brings the power of JSX to Markdown, enabling rich, interactive content.

## Why MDX?

- **Component Integration**: Use components directly in Markdown
- **Enhanced Content**: Create interactive tutorials and demos
- **Type Safety**: Full TypeScript support in content files

## Setup

\`\`\`bash
npx astro add mdx
\`\`\`

## Usage Example

\`\`\`mdx
import Button from '../components/Button.astro';

# My Article

Regular markdown content here.

<Button>Interactive button in MDX!</Button>
\`\`\`

Transform your content with the power of MDX!`,
      excerpt:
        'Enhance your content with MDX - bringing components and interactivity to your Markdown files.',
      author: 'Demo User',
      tags: JSON.stringify(['astro', 'mdx', 'content', 'markdown']),
      featured: false,
      published: true,
      pubDate: new Date('2024-02-10'),
      userId: 2,
      viewCount: 145,
    },
    {
      id: 5,
      title: 'Draft: Upcoming Features in Astro 5',
      slug: 'upcoming-features-astro-5',
      content: 'This is a draft post about upcoming features...',
      excerpt: "A sneak peek at what's coming in the next major version of Astro.",
      author: 'Jane Developer',
      tags: JSON.stringify(['astro', 'preview', 'draft']),
      featured: false,
      published: false,
      pubDate: new Date('2024-03-01'),
      userId: 3,
      viewCount: 0,
    },
  ])

  // Seed comments
  await db.insert(Comment).values([
    {
      id: 1,
      content: 'Great tutorial! This really helped me understand Astro DB better.',
      author: 'Alex Chen',
      email: 'alex@example.com',
      postId: 1,
      approved: true,
    },
    {
      id: 2,
      content: 'Thanks for the comprehensive guide. The examples are very helpful.',
      author: 'Sarah Johnson',
      email: 'sarah@example.com',
      website: 'https://sarahj.dev',
      postId: 1,
      approved: true,
    },
    {
      id: 3,
      content: 'I love how Astro handles components. This guide is exactly what I needed!',
      author: 'Mike Wilson',
      email: 'mike@example.com',
      postId: 2,
      approved: true,
    },
    {
      id: 4,
      content: 'This is spam content that should not be approved.',
      author: 'Spammer',
      email: 'spam@spam.com',
      postId: 1,
      approved: false,
    },
    {
      id: 5,
      content:
        'Following up on my previous comment - I implemented these optimizations and saw a 40% improvement!',
      author: 'Alex Chen',
      email: 'alex@example.com',
      postId: 3,
      parentId: 1,
      approved: true,
    },
  ])

  // Seed analytics
  await db.insert(Analytics).values([
    {
      id: 1,
      path: '/',
      title: 'Home',
      views: 1250,
      uniqueViews: 980,
    },
    {
      id: 2,
      path: '/blog/getting-started-astro-db',
      title: 'Getting Started with Astro DB',
      views: 156,
      uniqueViews: 142,
    },
    {
      id: 3,
      path: '/blog/building-reusable-astro-components',
      title: 'Building Reusable Astro Components',
      views: 89,
      uniqueViews: 78,
    },
    {
      id: 4,
      path: '/blog/optimizing-performance-astro',
      title: 'Optimizing Performance in Astro',
      views: 234,
      uniqueViews: 198,
    },
    {
      id: 5,
      path: '/about',
      title: 'About',
      views: 456,
      uniqueViews: 398,
    },
    {
      id: 6,
      path: '/contact',
      title: 'Contact',
      views: 234,
      uniqueViews: 189,
    },
  ])

  // Seed contact submissions
  await db.insert(ContactSubmission).values([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Question about Astro DB',
      message:
        'Hi, I have a question about database migrations in Astro DB. How do I handle schema changes in production?',
      status: 'responded',
    },
    {
      id: 2,
      name: 'Emily Brown',
      email: 'emily@example.com',
      subject: 'Partnership Opportunity',
      message: 'We would like to discuss a potential partnership opportunity with your team.',
      status: 'reviewed',
    },
    {
      id: 3,
      name: 'David Lee',
      email: 'david@example.com',
      message: 'Your Astro components are amazing! Keep up the great work.',
      status: 'pending',
    },
  ])

  // Seed newsletter subscribers
  await db.insert(Newsletter).values([
    {
      id: 1,
      email: 'subscriber1@example.com',
      name: 'Alice Walker',
      verified: true,
    },
    {
      id: 2,
      email: 'subscriber2@example.com',
      name: 'Bob Martin',
      verified: true,
    },
    {
      id: 3,
      email: 'subscriber3@example.com',
      verified: false,
      token: 'verify-token-123',
    },
    {
      id: 4,
      email: 'unsubscribed@example.com',
      name: 'Former Subscriber',
      verified: true,
      unsubscribedAt: new Date('2024-01-30'),
    },
  ])

  console.log('Database seeded successfully!')
}
