/**
 * Features data for displaying on the home page
 * This file contains all the main features of the astro-basics project
 * that will be displayed using the Card component
 */

/**
 * Feature card data structure that matches the Card component props
 */
export type FeatureCard = {
  /** Title of the feature (maps to cardTitle) */
  title: string
  /** Description of the feature (goes into the card slot) */
  description: string
  /** Optional image URL for the feature (maps to cardImage) */
  image?: string
  /** Optional link for more information (maps to cardLink) */
  link?: string
  /** Category for grouping features */
  category: 'core' | 'development' | 'user-experience' | 'security'
  /** Priority for ordering (higher numbers appear first) */
  priority: number
}

/**
 * Main features of the astro-basics project
 * Easy to update - just modify this array to add/remove/update features
 */
export const projectFeatures: FeatureCard[] = [
  {
    title: 'Content Management System',
    description:
      'Powerful content collections with MDX support, RSS feeds, tagging system, and publication workflow. Perfect for blogs, documentation, and content-rich websites.',
    image: 'https://picsum.photos/400/250?random=1',
    link: '/docs/1',
    category: 'core',
    priority: 100,
  },
  {
    title: 'Authentication & Security',
    description:
      'Complete Clerk integration with protected routes, user management, and security utilities. XSS protection, input validation, and trusted domain validation built-in.',
    image: 'https://picsum.photos/400/250?random=2',
    link: '/signin',
    category: 'security',
    priority: 95,
  },
  {
    title: 'Progressive Web App',
    description:
      'Full PWA implementation with offline support, service workers, install prompts, and native app-like experience. Works seamlessly across all devices.',
    image: 'https://picsum.photos/400/250?random=3',
    link: '/',
    category: 'user-experience',
    priority: 90,
  },
  {
    title: 'Component Library',
    description:
      '30+ Astro components plus React components for building modern websites. Layout, content display, forms, media, and utility components included.',
    image: 'https://picsum.photos/400/250?random=4',
    link: '/docs/1',
    category: 'development',
    priority: 85,
  },
  {
    title: 'Accessibility First',
    description:
      'Built-in screen reader support, keyboard navigation, text-to-speech integration, and comprehensive accessibility testing. WCAG compliant design patterns.',
    image: 'https://picsum.photos/400/250?random=5',
    link: '/about',
    category: 'user-experience',
    priority: 80,
  },
  {
    title: 'Developer Experience',
    description:
      'Comprehensive testing suite with Playwright and Vitest, TypeScript support, ESLint, Prettier, and automated quality checks. Hot reloading and SCSS compilation.',
    image: 'https://picsum.photos/400/250?random=6',
    link: '/docs/1',
    category: 'development',
    priority: 75,
  },
  {
    title: 'Multi-Platform Deployment',
    description:
      'Deploy to Netlify, Vercel, or Node.js with automatic adapter selection. Server-side rendering, performance optimization, and monitoring included.',
    image: 'https://picsum.photos/400/250?random=7',
    link: '/docs/1',
    category: 'development',
    priority: 70,
  },
  {
    title: 'Media & Content Integration',
    description:
      'YouTube embedding, image optimization with Sharp, responsive images, social media integration, and rich content embedding capabilities.',
    image: 'https://picsum.photos/400/250?random=8',
    link: '/posts/1',
    category: 'core',
    priority: 65,
  },
]

/**
 * Get features filtered by category
 */
export function getFeaturesByCategory(category: FeatureCard['category']): FeatureCard[] {
  return projectFeatures
    .filter(feature => feature.category === category)
    .sort((a, b) => b.priority - a.priority)
}

/**
 * Get top N features by priority
 */
export function getTopFeatures(count: number = 6): FeatureCard[] {
  return projectFeatures.sort((a, b) => b.priority - a.priority).slice(0, count)
}

/**
 * Get all features sorted by priority
 */
export function getAllFeatures(): FeatureCard[] {
  return projectFeatures.sort((a, b) => b.priority - a.priority)
}

/**
 * Feature categories with display names
 */
export const featureCategories = {
  core: 'Core Features',
  development: 'Developer Tools',
  'user-experience': 'User Experience',
  security: 'Security & Auth',
} as const
