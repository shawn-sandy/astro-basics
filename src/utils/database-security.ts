/**
 * Database security utilities for input validation and SQL injection prevention
 *
 * This module provides secure database operation patterns that should be used
 * throughout the application to prevent SQL injection attacks.
 *
 * @module DatabaseSecurity
 */

/**
 * Result type for consistent error handling
 * @typedef {Object} SuccessResult
 * @property {true} ok - Indicates successful operation
 * @property {*} value - The validated/processed value
 */

/**
 * @typedef {Object} ErrorResult
 * @property {false} ok - Indicates failed operation
 * @property {Error} error - The error that occurred
 */

/**
 * @typedef {SuccessResult | ErrorResult} Result
 */

/**
 * Validates email format and length to prevent SQL injection
 *
 * Security features:
 * - Type checking to ensure string input
 * - Length validation (max 254 characters per RFC 5321)
 * - Format validation using regex
 * - Trimming of whitespace
 *
 * @param {*} email - Email to validate
 * @returns {Result} ValidationResult with the validated email or an error
 *
 * @example
 * const result = validateEmail('user@example.com');
 * if (result.ok) {
 *   console.log('Valid email:', result.value);
 * } else {
 *   console.error('Invalid email:', result.error.message);
 * }
 */
export function validateEmail(email) {
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
 * Validates name field with comprehensive SQL injection protection
 *
 * Security features:
 * - Type checking to ensure string input
 * - Length validation (max 100 characters)
 * - SQL injection pattern detection
 * - SQL keyword filtering
 * - SQL comment pattern blocking
 * - Quote character filtering
 *
 * @param {*} name - Name to validate
 * @returns {Result} ValidationResult with the validated name or an error
 *
 * @example
 * const result = validateName('John Doe');
 * if (result.ok) {
 *   console.log('Valid name:', result.value);
 * } else {
 *   console.error('Invalid name:', result.error.message);
 * }
 *
 * @example
 * // This will be blocked
 * const malicious = validateName("'; DROP TABLE users; --");
 * console.log(malicious.ok); // false
 */
export function validateName(name) {
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

  // SQL injection pattern detection
  // These patterns are commonly used in SQL injection attacks
  const dangerousPatterns = [
    /['";]/, // SQL quotes and semicolons
    /--/, // SQL single-line comments
    /\/\*/, // SQL multi-line comment start
    /\*\//, // SQL multi-line comment end
    /\bunion\b/i, // SQL UNION keyword
    /\bselect\b/i, // SQL SELECT keyword
    /\binsert\b/i, // SQL INSERT keyword
    /\bupdate\b/i, // SQL UPDATE keyword
    /\bdelete\b/i, // SQL DELETE keyword
    /\bdrop\b/i, // SQL DROP keyword
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedName)) {
      return { ok: false, error: new Error('Name contains potentially dangerous characters') }
    }
  }

  return { ok: true, value: trimmedName }
}

/**
 * Validates message content with length restrictions
 *
 * Security features:
 * - Type checking to ensure string input
 * - Length validation (max 5000 characters)
 * - Trimming of whitespace
 *
 * @param {*} message - Message to validate
 * @returns {Result} ValidationResult with the validated message or an error
 *
 * @example
 * const result = validateMessage('This is a valid message.');
 * if (result.ok) {
 *   console.log('Valid message:', result.value);
 * } else {
 *   console.error('Invalid message:', result.error.message);
 * }
 */
export function validateMessage(message) {
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
 *
 * Security features:
 * - Handles null/undefined/empty values gracefully
 * - Type checking for non-null values
 * - Length validation (max 200 characters)
 * - Trimming of whitespace
 *
 * @param {*} subject - Subject to validate (can be null/undefined)
 * @returns {Result} ValidationResult with the validated subject or an error
 *
 * @example
 * const result = validateSubject('Optional subject line');
 * if (result.ok) {
 *   console.log('Valid subject:', result.value);
 * } else {
 *   console.error('Invalid subject:', result.error.message);
 * }
 *
 * @example
 * // Null subjects are allowed
 * const nullResult = validateSubject(null);
 * console.log(nullResult.ok, nullResult.value); // true, null
 */
export function validateSubject(subject) {
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
 * Validates numeric limit parameters for database queries
 *
 * Security features:
 * - Type checking and conversion
 * - Range validation (1-1000)
 * - NaN detection
 *
 * @param {*} limit - Limit value to validate
 * @returns {Result} ValidationResult with the validated limit or an error
 *
 * @example
 * const result = validateLimit(25);
 * if (result.ok) {
 *   console.log('Valid limit:', result.value);
 * } else {
 *   console.error('Invalid limit:', result.error.message);
 * }
 */
export function validateLimit(limit) {
  const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit
  if (typeof numLimit !== 'number' || isNaN(numLimit) || numLimit < 1 || numLimit > 1000) {
    return { ok: false, error: new Error('Invalid limit parameter (must be 1-1000)') }
  }
  return { ok: true, value: numLimit }
}

/**
 * Creates a secure SQL query builder for parameterized queries
 *
 * This utility helps ensure that all database operations use parameterized
 * queries instead of string concatenation, which prevents SQL injection.
 *
 * @example
 * const queryBuilder = createQueryBuilder();
 * const insertQuery = queryBuilder.insert('messages', {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   message: 'Hello world'
 * });
 * console.log(insertQuery.sql); // INSERT INTO messages (name, email, message) VALUES (?, ?, ?)
 * console.log(insertQuery.args); // ['John Doe', 'john@example.com', 'Hello world']
 */
export function createQueryBuilder() {
  return {
    /**
     * Creates a parameterized INSERT query
     * @param {string} table - Table name
     * @param {Object} data - Data to insert
     * @returns {{sql: string, args: Array}} Query object with SQL and arguments
     */
    insert(table, data) {
      const columns = Object.keys(data)
      const placeholders = columns.map(() => '?').join(', ')
      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      const args = Object.values(data)
      return { sql, args }
    },

    /**
     * Creates a parameterized SELECT query with limit
     * @param {string} table - Table name
     * @param {Array<string>} columns - Columns to select
     * @param {number} limit - Maximum number of results
     * @returns {{sql: string, args: Array}} Query object with SQL and arguments
     */
    select(table, columns = ['*'], limit = null) {
      const columnList = columns.join(', ')
      let sql = `SELECT ${columnList} FROM ${table}`
      const args = []

      if (limit !== null) {
        sql += ' LIMIT ?'
        args.push(limit)
      }

      return { sql, args }
    },
  }
}

/**
 * Security best practices documentation
 *
 * @readonly
 * @enum {string}
 */
export const SECURITY_GUIDELINES = {
  ALWAYS_USE_PARAMETERS: 'Always use parameterized queries with ? placeholders',
  VALIDATE_ALL_INPUTS: 'Validate and sanitize all user inputs before database operations',
  LIMIT_ERROR_DETAILS: 'Limit error message details to prevent information leakage',
  LOG_SECURITY_EVENTS: 'Log security-related events for monitoring and auditing',
  TEST_INJECTION_PATTERNS: 'Regularly test for SQL injection vulnerabilities',
  USE_LEAST_PRIVILEGE: 'Use database accounts with minimal required privileges',
}
