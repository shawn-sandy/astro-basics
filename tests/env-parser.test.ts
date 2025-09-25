import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import {
  EnvParser,
  createEnvParser,
  parseDefaultEnvFile,
  getDatabaseProvider,
  updateDatabaseProvider,
} from '#utils/env-parser'

describe('EnvParser', () => {
  const testDir = '/tmp/env-parser-tests'
  const testEnvFile = join(testDir, '.env')

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('parseContent', () => {
    it('should parse basic environment variables', () => {
      const content = `
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://example.turso.io
TURSO_AUTH_TOKEN=eyJhbGc...
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[0].value).toBe('turso')
        expect(result.value[0].hasComment).toBe(false)
      }
    })

    it('should handle whitespace variations around equals sign', () => {
      const content = `
DATABASE_PROVIDER  =  turso
TURSO_DATABASE_URL=   libsql://example.turso.io   
TURSO_AUTH_TOKEN   =eyJhbGc...
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[0].value).toBe('turso')
        expect(result.value[1].value).toBe('libsql://example.turso.io')
        expect(result.value[2].value).toBe('eyJhbGc...')
      }
    })

    it('should handle inline comments with hash symbol', () => {
      const content = `
DATABASE_PROVIDER=turso # Use Turso database
TURSO_DATABASE_URL=libsql://example.turso.io #Production URL
TURSO_AUTH_TOKEN=eyJhbGc... # Auth token for production
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].hasComment).toBe(true)
        expect(result.value[0].comment).toBe('Use Turso database')
        expect(result.value[1].comment).toBe('Production URL')
        expect(result.value[2].comment).toBe('Auth token for production')
      }
    })

    it('should handle inline comments with double slash', () => {
      const content = `
DATABASE_PROVIDER=turso // Use Turso database
TURSO_DATABASE_URL=libsql://example.turso.io // Production URL
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].hasComment).toBe(true)
        expect(result.value[0].comment).toBe('Use Turso database')
        expect(result.value[1].comment).toBe('Production URL')
      }
    })

    it('should handle quoted values with spaces', () => {
      const content = `
DATABASE_PROVIDER="turso with spaces"
APP_NAME='My Astro App'
DESCRIPTION="This is a test"
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].value).toBe('turso with spaces')
        expect(result.value[1].value).toBe('My Astro App')
        expect(result.value[2].value).toBe('This is a test')
      }
    })

    it('should skip comment-only lines', () => {
      const content = `
# This is a comment
DATABASE_PROVIDER=turso
// Another comment
TURSO_DATABASE_URL=libsql://example.turso.io
# Final comment
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[1].key).toBe('TURSO_DATABASE_URL')
      }
    })

    it('should skip empty lines', () => {
      const content = `

DATABASE_PROVIDER=turso

TURSO_DATABASE_URL=libsql://example.turso.io


`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
      }
    })

    it('should handle complex whitespace and comment combinations', () => {
      const content = `
  DATABASE_PROVIDER  =   turso   # Primary database provider
  TURSO_DATABASE_URL=libsql://example.turso.io    // Production database URL  
     TURSO_AUTH_TOKEN   =   "eyJhbGc..."     # Secret token with quotes
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[0].value).toBe('turso')
        expect(result.value[0].comment).toBe('Primary database provider')
        expect(result.value[1].comment).toBe('Production database URL')
        expect(result.value[2].value).toBe('eyJhbGc...')
        expect(result.value[2].comment).toBe('Secret token with quotes')
      }
    })

    it('should handle malformed lines when ignoreMalformed is true', () => {
      const content = `
DATABASE_PROVIDER=turso
INVALID LINE WITHOUT EQUALS
TURSO_DATABASE_URL=libsql://example.turso.io
=INVALID_START
`
      const parser = new EnvParser(testEnvFile, { ignoreMalformed: true })
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[1].key).toBe('TURSO_DATABASE_URL')
      }
    })

    it('should fail on malformed lines when ignoreMalformed is false', () => {
      const content = `
DATABASE_PROVIDER=turso
INVALID LINE WITHOUT EQUALS
`
      const parser = new EnvParser(testEnvFile, { ignoreMalformed: false })
      const result = parser.parseContent(content)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Malformed environment variable')
      }
    })

    it('should handle edge case with empty values', () => {
      const content = `
DATABASE_PROVIDER=
TURSO_DATABASE_URL= # Empty with comment
EMPTY_QUOTED=""
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].value).toBe('')
        expect(result.value[1].value).toBe('')
        expect(result.value[1].comment).toBe('Empty with comment')
        expect(result.value[2].value).toBe('')
      }
    })

    it('should handle special characters in values', () => {
      const content = `
DATABASE_PROVIDER=turso://user:pass@host:3306/db?ssl=true
COMPLEX_URL="https://api.example.com/v1/webhook?token=abc123&secret=xyz789"
REGEX_PATTERN="^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
`
      const parser = new EnvParser(testEnvFile)
      const result = parser.parseContent(content)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(3)
        expect(result.value[0].value).toBe('turso://user:pass@host:3306/db?ssl=true')
        expect(result.value[1].value).toBe(
          'https://api.example.com/v1/webhook?token=abc123&secret=xyz789'
        )
        expect(result.value[2].value).toBe('^[a-zA-Z0-9_-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
      }
    })
  })

  describe('findVariable', () => {
    it('should find existing DATABASE_PROVIDER variable', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
DATABASE_PROVIDER=turso # Use Turso
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(testEnvFile, content)

      const parser = new EnvParser(testEnvFile)
      const result = parser.findVariable('DATABASE_PROVIDER')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).not.toBe(null)
        expect(result.value?.key).toBe('DATABASE_PROVIDER')
        expect(result.value?.value).toBe('turso')
        expect(result.value?.comment).toBe('Use Turso')
      }
    })

    it('should return null for non-existent variable', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(testEnvFile, content)

      const parser = new EnvParser(testEnvFile)
      const result = parser.findVariable('DATABASE_PROVIDER')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(null)
      }
    })

    it('should handle file not found error', () => {
      const parser = new EnvParser('/nonexistent/file/.env')
      const result = parser.findVariable('DATABASE_PROVIDER')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Environment file not found')
      }
    })
  })

  describe('updateVariable', () => {
    it('should update existing DATABASE_PROVIDER variable', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
DATABASE_PROVIDER=supabase
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(testEnvFile, content)

      const parser = new EnvParser(testEnvFile)
      const updateResult = parser.updateVariable('DATABASE_PROVIDER', 'turso', 'Switched to Turso')

      expect(updateResult.ok).toBe(true)

      // Verify the update
      const findResult = parser.findVariable('DATABASE_PROVIDER')
      expect(findResult.ok).toBe(true)
      if (findResult.ok) {
        expect(findResult.value?.value).toBe('turso')
        expect(findResult.value?.comment).toBe('Switched to Turso')
      }
    })

    it('should add new DATABASE_PROVIDER variable if not exists', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(testEnvFile, content)

      const parser = new EnvParser(testEnvFile)
      const updateResult = parser.updateVariable(
        'DATABASE_PROVIDER',
        'turso',
        'Added Turso provider'
      )

      expect(updateResult.ok).toBe(true)

      // Verify the addition
      const findResult = parser.findVariable('DATABASE_PROVIDER')
      expect(findResult.ok).toBe(true)
      if (findResult.ok) {
        expect(findResult.value?.value).toBe('turso')
        expect(findResult.value?.comment).toBe('Added Turso provider')
      }
    })

    it('should handle values that need quoting', () => {
      const content = `EXISTING_VAR=value`
      writeFileSync(testEnvFile, content)

      const parser = new EnvParser(testEnvFile)
      const updateResult = parser.updateVariable(
        'DATABASE_PROVIDER',
        'turso with spaces',
        'Value with spaces'
      )

      expect(updateResult.ok).toBe(true)

      // Verify the addition with proper quoting
      const findResult = parser.findVariable('DATABASE_PROVIDER')
      expect(findResult.ok).toBe(true)
      if (findResult.ok) {
        expect(findResult.value?.value).toBe('turso with spaces')
        expect(findResult.value?.comment).toBe('Value with spaces')
      }
    })

    it('should handle file not found error', () => {
      const parser = new EnvParser('/nonexistent/file/.env')
      const result = parser.updateVariable('DATABASE_PROVIDER', 'turso')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.message).toContain('Environment file not found')
      }
    })
  })

  describe('convenience functions', () => {
    beforeEach(() => {
      // Change to test directory for default .env file tests
      const originalCwd = process.cwd()
      process.chdir(testDir)

      // Clean up on exit
      afterEach(() => {
        process.chdir(originalCwd)
      })
    })

    it('should parse default .env file with parseDefaultEnvFile', () => {
      const content = `
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(join(testDir, '.env'), content)

      const result = parseDefaultEnvFile()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toHaveLength(2)
        expect(result.value[0].key).toBe('DATABASE_PROVIDER')
        expect(result.value[0].value).toBe('turso')
      }
    })

    it('should get DATABASE_PROVIDER with getDatabaseProvider', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
DATABASE_PROVIDER=turso
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(join(testDir, '.env'), content)

      const result = getDatabaseProvider()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('turso')
      }
    })

    it('should return null when DATABASE_PROVIDER does not exist', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
TURSO_DATABASE_URL=libsql://example.turso.io
`
      writeFileSync(join(testDir, '.env'), content)

      const result = getDatabaseProvider()

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(null)
      }
    })

    it('should update DATABASE_PROVIDER with updateDatabaseProvider', () => {
      const content = `
SUPABASE_URL=https://example.supabase.co
DATABASE_PROVIDER=supabase
`
      writeFileSync(join(testDir, '.env'), content)

      const updateResult = updateDatabaseProvider('turso', 'Switched to Turso database')

      expect(updateResult.ok).toBe(true)

      // Verify the update
      const getResult = getDatabaseProvider()
      expect(getResult.ok).toBe(true)
      if (getResult.ok) {
        expect(getResult.value).toBe('turso')
      }
    })
  })

  describe('createEnvParser factory', () => {
    it('should create parser with default options', () => {
      const parser = createEnvParser(testEnvFile)
      expect(parser).toBeInstanceOf(EnvParser)
    })

    it('should create parser with custom options', () => {
      const parser = createEnvParser(testEnvFile, { ignoreMalformed: false })
      expect(parser).toBeInstanceOf(EnvParser)
    })
  })
})
