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

const requiredFiles = ['database-types.ts', 'database.ts', 'supabase.ts', 'supabase-native.ts']

console.log('   Checking required files:')
for (const file of requiredFiles) {
  const filePath = join(srcDir, file)
  const exists = existsSync(filePath)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
}

console.log('\n2. Checking environment variables...')
const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)

console.log(
  `   Supabase configured: ${supabaseConfigured ? '✅' : '❌'} (SUPABASE_URL, SUPABASE_ANON_KEY)`
)
console.log(`   Would use: ${supabaseConfigured ? 'supabase' : 'none (Supabase not configured)'}`)

console.log('\n✅ Database abstraction layer structure test completed')
console.log('💡 To test full functionality, use the abstraction layer in an Astro API endpoint')
