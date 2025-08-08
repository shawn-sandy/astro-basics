#!/usr/bin/env node --env-file=.env

import { createClient } from '@libsql/client'

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

console.log('🔍 Testing Turso connection...')
console.log('   Database URL:', TURSO_DATABASE_URL ? '✅ Set' : '❌ Not set')
console.log('   Auth Token:', TURSO_AUTH_TOKEN ? '✅ Set' : '❌ Not set')

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const client = createClient({
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
})

async function testConnection() {
  try {
    // Try a simple query first
    console.log('\n🔄 Testing simple query...')
    const result = await client.execute('SELECT 1 as test')
    console.log('✅ Connection successful!')
    console.log('   Result:', result.rows[0])

    // List existing tables
    console.log('\n📋 Listing existing tables...')
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")

    if (tables.rows.length > 0) {
      console.log('   Found tables:')
      tables.rows.forEach(row => {
        console.log('   - ' + row.name)
      })
    } else {
      console.log('   No tables found')
    }

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message)
    if (error.cause) {
      console.error('   Cause:', error.cause.message)
    }
    if (error.code) {
      console.error('   Error code:', error.code)
    }
    process.exit(1)
  }
}

testConnection()
