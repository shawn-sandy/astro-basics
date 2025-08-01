#!/usr/bin/env node

/**
 * Conditional build script for Astro DB projects
 *
 * This script determines the appropriate build command based on:
 * - Database environment variables
 * - Environment mode (development vs production)
 */

import { execSync } from 'child_process'
import { loadEnv } from 'vite'

// Load environment variables
const mode = process.env.NODE_ENV || 'production'
const env = loadEnv(mode, process.cwd(), '')

// Check if database is configured
const isDatabaseEnabled = !!(
  env.ASTRO_DATABASE_FILE ||
  env.ASTRO_DATABASE_URL ||
  process.env.ASTRO_DATABASE_FILE ||
  process.env.ASTRO_DATABASE_URL
)

console.log(`🔍 Build Environment: ${mode}`)
console.log(`🗄️  Database enabled: ${isDatabaseEnabled}`)

if (isDatabaseEnabled) {
  console.log(`📊 Database config found:`)
  if (env.ASTRO_DATABASE_FILE || process.env.ASTRO_DATABASE_FILE) {
    console.log(
      `   - Local database file: ${env.ASTRO_DATABASE_FILE || process.env.ASTRO_DATABASE_FILE}`
    )
  }
  if (env.ASTRO_DATABASE_URL || process.env.ASTRO_DATABASE_URL) {
    console.log(`   - Remote database URL configured`)
  }
}

let buildCommand

if (!isDatabaseEnabled) {
  console.log(`⚙️  Building without database integration...`)
  buildCommand = 'astro build'
} else {
  // For production builds with database, we need to check the environment
  const isProduction = mode === 'production' || process.env.CI === 'true'
  const hasRemoteDb = !!(env.ASTRO_DATABASE_URL || process.env.ASTRO_DATABASE_URL)

  if (isProduction || hasRemoteDb) {
    console.log(`🚀 Building for production with remote database...`)
    buildCommand = 'astro build --remote'
  } else {
    console.log(`🔧 Building for development with local database...`)
    buildCommand = 'astro build'
  }
}

console.log(`🏗️  Running: ${buildCommand}`)

try {
  execSync(buildCommand, {
    stdio: 'inherit',
    cwd: process.cwd(),
  })
  console.log(`✅ Build completed successfully!`)
} catch (error) {
  console.error(`❌ Build failed:`, error.message)
  process.exit(1)
}
