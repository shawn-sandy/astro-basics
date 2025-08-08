#!/usr/bin/env node --env-file=.env

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_DATABASE_URL) {
  console.error('❌ TURSO_DATABASE_URL must be set in your .env file or environment variables.')
  process.exit(1)
}

if (!TURSO_AUTH_TOKEN) {
  console.error('❌ TURSO_AUTH_TOKEN must be set in your .env file or environment variables.')
  process.exit(1)
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
})

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...')

    const schemaPath = join(__dirname, '..', 'db', 'schema.sql')
    const schemaContent = readFileSync(schemaPath, 'utf-8')

    // Clean up the SQL - remove extra whitespace and ensure it's properly formatted
    const schema = schemaContent.trim()

    console.log('📝 Executing SQL:', schema)

    // Execute the SQL statement
    const executeResult = await client.execute(schema)
    console.log('✅ Database schema installed successfully!')
    console.log('   Rows affected:', executeResult.rowsAffected)

    // Verify the table was created
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
    )

    if (result.rows.length > 0) {
      console.log('✅ Verified: messages table exists')
    } else {
      console.log('⚠️  Warning: messages table not found after creation')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to setup database schema:', error.message)
    if (error.cause) {
      console.error('   Cause:', error.cause.message)
    }
    process.exit(1)
  }
}

setupDatabase()
