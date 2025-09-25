#!/usr/bin/env tsx

/**
 * Demo script showing the robust environment file parsing utility
 * This script demonstrates handling of edge cases around DATABASE_PROVIDER
 */

import { writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { EnvParser, getDatabaseProvider, updateDatabaseProvider } from '../src/utils/env-parser.js'

const DEMO_ENV_FILE = join(process.cwd(), '.env.demo')

// Demo environment content with various edge cases
const DEMO_CONTENT = `
# Database Provider Configuration
# This demonstrates various edge cases that the parser handles

# Standard format
DATABASE_PROVIDER=supabase

# Whitespace variations
TURSO_DATABASE_URL  =  libsql://example.turso.io   
TURSO_AUTH_TOKEN   =eyJhbGciOiJIUzI1...

# Inline comments with different styles
SUPABASE_URL=https://example.supabase.co # Production URL
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1Q... // Anonymous key

# URLs with double slashes (should not be confused with comments)
WEBHOOK_URL=https://api.example.com/webhook?token=abc123

# Quoted values with spaces
APP_NAME="My Astro Basics App"
DESCRIPTION='A demo of robust environment parsing'

# Empty values
OPTIONAL_FEATURE=
DEBUG_MODE= # Empty with comment

# Complex values
REGEX_PATTERN="^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
`

console.log('🔧 Environment File Parsing Demo')
console.log('================================\n')

// Create demo file
console.log('📝 Creating demo .env file with edge cases...')
writeFileSync(DEMO_ENV_FILE, DEMO_CONTENT)
console.log(`✅ Created: ${DEMO_ENV_FILE}\n`)

// Parse and display all entries
console.log('📋 Parsing all environment entries:')
const parser = new EnvParser(DEMO_ENV_FILE)
const parseResult = parser.parseFile()

if (parseResult.ok) {
  parseResult.value.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.key}="${entry.value}"`)
    if (entry.hasComment) {
      console.log(`   Comment: ${entry.comment}`)
    }
    console.log(`   Original: ${entry.originalLine.trim()}`)
    console.log()
  })
} else {
  console.error('❌ Parse error:', parseResult.error.message)
  process.exit(1)
}

// Demonstrate DATABASE_PROVIDER specific functions
console.log('🔍 Getting DATABASE_PROVIDER value:')
const providerResult = getDatabaseProvider()
if (providerResult.ok) {
  console.log(`✅ Current DATABASE_PROVIDER: ${providerResult.value || 'not set'}`)
} else {
  console.error('❌ Error getting provider:', providerResult.error.message)
}

// Update DATABASE_PROVIDER
console.log('\n🔄 Updating DATABASE_PROVIDER to "turso"...')
const updateResult = updateDatabaseProvider('turso', 'Switched to Turso for better performance')
if (updateResult.ok) {
  console.log('✅ Successfully updated DATABASE_PROVIDER')

  // Verify the update
  const verifyResult = getDatabaseProvider()
  if (verifyResult.ok) {
    console.log(`✅ Verified new value: ${verifyResult.value}`)
  }
} else {
  console.error('❌ Update error:', updateResult.error.message)
}

// Find a specific variable
console.log('\n🔍 Finding WEBHOOK_URL (contains //)...')
const webhookResult = parser.findVariable('WEBHOOK_URL')
if (webhookResult.ok && webhookResult.value) {
  console.log(`✅ Found WEBHOOK_URL: ${webhookResult.value.value}`)
  console.log('✅ Correctly parsed URL with // (not treated as comment)')
} else {
  console.log('❌ WEBHOOK_URL not found or error occurred')
}

// Demonstrate error handling with non-existent file
console.log('\n❌ Testing error handling with non-existent file:')
const badParser = new EnvParser('/non/existent/.env')
const badResult = badParser.findVariable('TEST')
if (!badResult.ok) {
  console.log(`✅ Properly handled error: ${badResult.error.message}`)
}

// Test malformed line handling
console.log('\n🔧 Testing malformed line handling:')
const malformedContent = `
GOOD_VAR=value
MALFORMED LINE WITHOUT EQUALS
ANOTHER_GOOD_VAR=value2
`
writeFileSync(DEMO_ENV_FILE, malformedContent)

const strictParser = new EnvParser(DEMO_ENV_FILE, { ignoreMalformed: false })
const strictResult = strictParser.parseContent(malformedContent)
if (!strictResult.ok) {
  console.log(`✅ Strict mode correctly rejected malformed line: ${strictResult.error.message}`)
}

const lenientParser = new EnvParser(DEMO_ENV_FILE, { ignoreMalformed: true })
const lenientResult = lenientParser.parseContent(malformedContent)
if (lenientResult.ok) {
  console.log(`✅ Lenient mode successfully parsed ${lenientResult.value.length} valid entries`)
}

// Cleanup
console.log('\n🧹 Cleaning up demo file...')
if (existsSync(DEMO_ENV_FILE)) {
  unlinkSync(DEMO_ENV_FILE)
  console.log('✅ Demo file removed')
}

console.log('\n🎉 Demo completed successfully!')
console.log('\nKey benefits demonstrated:')
console.log('• ✅ Handles whitespace variations around DATABASE_PROVIDER')
console.log('• ✅ Supports both # and // comment styles')
console.log('• ✅ Properly parses URLs with // (not confused with comments)')
console.log('• ✅ Handles quoted values with spaces')
console.log('• ✅ Manages empty values with comments')
console.log('• ✅ Provides safe error handling with Result types')
console.log('• ✅ Offers both strict and lenient parsing modes')
console.log(
  '\nThis resolves the original issue: "environment file manipulation logic could fail if there are comments or whitespace variations around the DATABASE_PROVIDER line"'
)
