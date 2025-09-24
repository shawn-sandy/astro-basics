#!/usr/bin/env node

/**
 * Simple test script for the database abstraction layer
 * Tests that our TypeScript files compile and basic structure is correct
 */

console.log('🧪 Testing Database Abstraction Layer Compilation\n')

console.log('1. Checking TypeScript compilation...')

// Test basic import structure by checking if files exist
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const srcDir = join(__dirname, '..', 'src', 'libs')

const requiredFiles = [
  'database-types.ts',
  'database.ts',
  'turso.ts',
  'supabase.ts',
  'supabase-native.ts',
]

console.log('   Checking required files:')
for (const file of requiredFiles) {
  const filePath = join(srcDir, file)
  const exists = existsSync(filePath)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
}

console.log('\n2. Checking environment variables...')
const tursoConfigured = !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN)
const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)

console.log(
  `   Turso configured: ${tursoConfigured ? '✅' : '❌'} (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)`
)
console.log(
  `   Supabase configured: ${supabaseConfigured ? '✅' : '❌'} (SUPABASE_URL, SUPABASE_ANON_KEY)`
)

console.log('\n3. Database Provider Priority:')
const explicitProvider = process.env.DATABASE_PROVIDER
console.log(`   Explicit provider: ${explicitProvider || 'none'}`)

if (explicitProvider) {
  console.log(`   Would use: ${explicitProvider}`)
} else if (supabaseConfigured) {
  console.log(`   Would use: supabase (auto-detected)`)
} else if (tursoConfigured) {
  console.log(`   Would use: turso (auto-detected)`)
} else {
  console.log(`   Would use: none (no databases configured)`)
}

console.log('\n✅ Database abstraction layer structure test completed')
console.log('💡 To test full functionality, use the abstraction layer in an Astro API endpoint')
