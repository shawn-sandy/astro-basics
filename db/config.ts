import { defineDb, defineTable, column, NOW } from 'astro:db'

// User table for storing user information
const User = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    email: column.text({ unique: true }),
    name: column.text(),
    avatar: column.text({ optional: true }),
    bio: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['email'], unique: true }, { on: ['createdAt'] }],
})

// Post table for storing blog posts
const Post = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    slug: column.text({ unique: true }),
    content: column.text(),
    excerpt: column.text({ optional: true }),
    author: column.text(),
    tags: column.json(), // Store array of tags
    featured: column.boolean({ default: false }),
    published: column.boolean({ default: false }),
    pubDate: column.date(),
    updatedDate: column.date({ optional: true }),
    image: column.text({ optional: true }),
    imageAlt: column.text({ optional: true }),
    userId: column.number({ references: () => User.columns.id, optional: true }),
    viewCount: column.number({ default: 0 }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
  indexes: [
    { on: ['slug'], unique: true },
    { on: ['published', 'pubDate'] },
    { on: ['featured', 'published'] },
    { on: ['userId'] },
    { on: ['tags'] },
  ],
})

// Comment table for storing post comments
const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    content: column.text(),
    author: column.text(),
    email: column.text(),
    website: column.text({ optional: true }),
    postId: column.number({ references: () => Post.columns.id }),
    parentId: column.number({ references: () => Comment.columns.id, optional: true }),
    approved: column.boolean({ default: false }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['postId', 'approved'] }, { on: ['parentId'] }, { on: ['createdAt'] }],
})

// Analytics table for tracking page views
const Analytics = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    path: column.text(),
    title: column.text({ optional: true }),
    referrer: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    views: column.number({ default: 1 }),
    uniqueViews: column.number({ default: 1 }),
    lastViewed: column.date({ default: NOW }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['path'], unique: true }, { on: ['lastViewed'] }],
})

// Contact form submissions table
const ContactSubmission = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    name: column.text(),
    email: column.text(),
    subject: column.text({ optional: true }),
    message: column.text(),
    status: column.text({ default: 'pending' }), // pending, reviewed, responded
    ipAddress: column.text({ optional: true }),
    userAgent: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
  indexes: [{ on: ['email'] }, { on: ['status'] }, { on: ['createdAt'] }],
})

// Newsletter subscribers table
const Newsletter = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    email: column.text({ unique: true }),
    name: column.text({ optional: true }),
    subscribedAt: column.date({ default: NOW }),
    unsubscribedAt: column.date({ optional: true }),
    verified: column.boolean({ default: false }),
    token: column.text({ optional: true }),
  },
  indexes: [{ on: ['email'], unique: true }, { on: ['verified'] }],
})

// https://astro.build/db/config
export default defineDb({
  tables: {
    User,
    Post,
    Comment,
    Analytics,
    ContactSubmission,
    Newsletter,
  },
})
