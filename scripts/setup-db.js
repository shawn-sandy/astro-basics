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

// Result type for consistent error handling (using JSDoc for type documentation)
/**
 * @typedef {Object} SuccessResult
 * @property {true} ok
 * @property {*} value
 */

/**
 * @typedef {Object} ErrorResult
 * @property {false} ok
 * @property {Error} error
 */

/**
 * @typedef {SuccessResult | ErrorResult} Result
 */

/**
 * Validates email format and length
 * @param {*} email - Email to validate
 * @returns {Result} ValidationResult with the validated email or an error
 */
function validateEmail(email) {
  if (typeof email !== 'string') {
    return { ok: false, error: new Error('Email must be a string') }
  }

  const trimmedEmail = email.trim()

  if (trimmedEmail.length === 0) {
    return { ok: false, error: new Error('Email is required') }
  }

  if (trimmedEmail.length > 254) {
    return { ok: false, error: new Error('Email too long (max 254 characters)') }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { ok: false, error: new Error('Invalid email format') }
  }

  return { ok: true, value: trimmedEmail }
}

/**
 * Validates name field
 * @param {*} name - Name to validate
 * @returns {Result} ValidationResult with the validated name or an error
 */
function validateName(name) {
  if (typeof name !== 'string') {
    return { ok: false, error: new Error('Name must be a string') }
  }

  const trimmedName = name.trim()

  if (trimmedName.length === 0) {
    return { ok: false, error: new Error('Name is required') }
  }

  if (trimmedName.length > 100) {
    return { ok: false, error: new Error('Name too long (max 100 characters)') }
  }

  // Basic SQL injection pattern detection
  const dangerousPatterns = [
    /['";]/, // SQL quotes and semicolons
    /--/, // SQL comments
    /\/\*/, // Multi-line SQL comments
    /\*\//, // End of multi-line SQL comments
    /\bunion\b/i, // SQL UNION
    /\bselect\b/i, // SQL SELECT
    /\binsert\b/i, // SQL INSERT
    /\bupdate\b/i, // SQL UPDATE
    /\bdelete\b/i, // SQL DELETE
    /\bdrop\b/i, // SQL DROP
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedName)) {
      return { ok: false, error: new Error('Name contains potentially dangerous characters') }
    }
  }

  return { ok: true, value: trimmedName }
}

/**
 * Validates message content
 * @param {*} message - Message to validate
 * @returns {Result} ValidationResult with the validated message or an error
 */
function validateMessage(message) {
  if (typeof message !== 'string') {
    return { ok: false, error: new Error('Message must be a string') }
  }

  const trimmedMessage = message.trim()

  if (trimmedMessage.length === 0) {
    return { ok: false, error: new Error('Message is required') }
  }

  if (trimmedMessage.length > 5000) {
    return { ok: false, error: new Error('Message too long (max 5000 characters)') }
  }

  return { ok: true, value: trimmedMessage }
}

/**
 * Validates optional subject field
 * @param {*} subject - Subject to validate
 * @returns {Result} ValidationResult with the validated subject or an error
 */
function validateSubject(subject) {
  if (subject === null || subject === undefined || subject === '') {
    return { ok: true, value: null }
  }

  if (typeof subject !== 'string') {
    return { ok: false, error: new Error('Subject must be a string') }
  }

  const trimmedSubject = subject.trim()

  if (trimmedSubject.length > 200) {
    return { ok: false, error: new Error('Subject too long (max 200 characters)') }
  }

  return { ok: true, value: trimmedSubject }
}

/**
 * Safely insert a message using parameterized queries
 * @param {*} client - Database client
 * @param {*} messageData - Message data to insert
 * @returns {Promise<Result>} Promise with the result of the operation
 */
async function insertMessage(client, messageData) {
  try {
    // Validate all input data
    const nameResult = validateName(messageData.name)
    if (!nameResult.ok) {
      return { ok: false, error: nameResult.error }
    }

    const emailResult = validateEmail(messageData.email)
    if (!emailResult.ok) {
      return { ok: false, error: emailResult.error }
    }

    const messageResult = validateMessage(messageData.message)
    if (!messageResult.ok) {
      return { ok: false, error: messageResult.error }
    }

    const subjectResult = validateSubject(messageData.subject)
    if (!subjectResult.ok) {
      return { ok: false, error: subjectResult.error }
    }

    // Use parameterized query to prevent SQL injection
    const result = await client.execute({
      sql: 'INSERT INTO messages (name, email, message, subject) VALUES (?, ?, ?, ?)',
      args: [nameResult.value, emailResult.value, messageResult.value, subjectResult.value],
    })

    console.log('✅ Message inserted successfully')
    console.log('   Rows affected:', result.rowsAffected)

    return { ok: true, value: result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Failed to insert message:', errorMessage)

    // Return generic error to prevent information leakage
    return { ok: false, error: new Error('Database operation failed') }
  }
}

/**
 * Safely retrieve messages using parameterized queries
 * @param {*} client - Database client
 * @param {number} limit - Maximum number of messages to retrieve
 * @returns {Promise<Result>} Promise with the result of the operation
 */
async function getMessages(client, limit = 10) {
  try {
    // Validate limit parameter
    const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit
    if (isNaN(numLimit) || numLimit < 1 || numLimit > 1000) {
      return { ok: false, error: new Error('Invalid limit parameter (must be 1-1000)') }
    }

    // Use parameterized query
    const result = await client.execute({
      sql: 'SELECT id, name, email, message, subject, created_at FROM messages ORDER BY created_at DESC LIMIT ?',
      args: [numLimit],
    })

    console.log('✅ Messages retrieved successfully')
    console.log('   Count:', result.rows.length)

    return { ok: true, value: result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Failed to retrieve messages:', errorMessage)

    return { ok: false, error: new Error('Database operation failed') }
  }
}

async function setupDatabase() {
  try {
    console.log('🔄 Setting up database schema...')

    const schemaPath = join(__dirname, '..', 'db', 'schema.sql')
    const schemaContent = readFileSync(schemaPath, 'utf-8')

    // Clean up the SQL - remove extra whitespace and ensure it's properly formatted
    const schema = schemaContent.trim()

    console.log('📝 Executing SQL schema...')

    // Execute the SQL statement (this is safe as it's from a controlled file)
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

    // Demo secure database operations (only if DEMO_SECURE_OPS is set)
    if (process.env.DEMO_SECURE_OPS === 'true') {
      console.log('\n🔧 Demonstrating secure database operations...')

      // Example of secure message insertion
      const sampleMessage = {
        name: 'Demo User',
        email: 'demo@example.com',
        message: 'This is a secure database operation demo.',
        subject: 'Security Demo',
      }

      const insertResult = await insertMessage(client, sampleMessage)
      if (insertResult.ok) {
        console.log('✅ Secure insertion demo completed')
      } else {
        console.log('❌ Secure insertion demo failed:', insertResult.error.message)
      }

      // Example of secure message retrieval
      const getResult = await getMessages(client, 5)
      if (getResult.ok) {
        console.log('✅ Secure retrieval demo completed')
        console.log('   Sample data retrieved successfully')
      } else {
        console.log('❌ Secure retrieval demo failed:', getResult.error.message)
      }

      // Example of input validation (demonstrating SQL injection protection)
      console.log('\n🛡️  Testing SQL injection protection...')

      const maliciousInputs = [
        {
          name: "'; DROP TABLE messages; --",
          email: 'test@example.com',
          message: 'test',
          subject: null,
        },
        {
          name: 'Test User',
          email: "test@example.com'; DELETE FROM messages; --",
          message: 'test',
          subject: null,
        },
        {
          name: 'Test User',
          email: 'test@example.com',
          message: "test'; UNION SELECT * FROM sqlite_master; --",
          subject: null,
        },
      ]

      for (const maliciousInput of maliciousInputs) {
        const result = await insertMessage(client, maliciousInput)
        if (!result.ok) {
          console.log('✅ SQL injection attempt blocked:', result.error.message)
        } else {
          console.log('❌ SQL injection attempt was not blocked - this is a security issue!')
        }
      }
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

// Export functions for testing
export { validateEmail, validateName, validateMessage, validateSubject, insertMessage, getMessages }

setupDatabase()
