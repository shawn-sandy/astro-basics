#!/usr/bin/env node

/**
 * Simplified build script for Netlify deployment
 *
 * This script uses environment variables to determine build approach:
 * - If ASTRO_DATABASE_URL exists, build with --remote
 * - Otherwise, build normally (database will be handled as external)
 */

import { execSync } from 'child_process'

// Simple environment check
const hasRemoteDb = !!(
  process.env.ASTRO_DATABASE_URL ||
  process.env.TURSO_DATABASE_URL ||
  process.env.DATABASE_URL
)
const isNetlify = process.env.NETLIFY === 'true'

console.log(`🔍 Build Environment: ${process.env.NODE_ENV || 'production'}`)
console.log(`🌐 Netlify Build: ${isNetlify}`)
console.log(`🗄️  Remote Database: ${hasRemoteDb}`)

// For Netlify, always use standard build - database is handled as external
let buildCommand = 'astro build'

if (hasRemoteDb && !isNetlify) {
  console.log(`🚀 Building with remote database...`)
  buildCommand = 'astro build --remote'
} else {
  console.log(`🏗️  Building with standard configuration...`)
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
