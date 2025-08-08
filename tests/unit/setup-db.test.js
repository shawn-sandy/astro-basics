import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Mock external dependencies
vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: vi.fn(),
    close: vi.fn(),
  }))
}))

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}))

// Mock console methods
const originalConsole = console
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
}

// Mock process methods
const originalProcess = process
const mockProcess = {
  ...process,
  exit: vi.fn(),
  env: {}
}

describe('Database Setup Script', () => {
  let createClient
  let mockClient

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup mocks
    const libsqlClient = await import('@libsql/client')
    createClient = libsqlClient.createClient
    
    mockClient = {
      execute: vi.fn(),
      close: vi.fn(),
    }
    createClient.mockReturnValue(mockClient)
    
    // Mock global objects
    global.console = mockConsole
    global.process = mockProcess
    
    // Reset environment
    mockProcess.env = {}
  })

  afterEach(() => {
    global.console = originalConsole
    global.process = originalProcess
    vi.resetModules()
  })

  describe('Environment Variable Validation', () => {
    it('should exit with error when TURSO_DATABASE_URL is missing', async () => {
      mockProcess.env = {
        TURSO_AUTH_TOKEN: 'test-token'
      }

      // Import the module to trigger validation
      await import('../../scripts/setup-db.js')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ TURSO_DATABASE_URL must be set in your .env file or environment variables.'
      )
      expect(mockProcess.exit).toHaveBeenCalledWith(1)
    })

    it('should exit with error when TURSO_AUTH_TOKEN is missing', async () => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com'
      }

      await import('../../scripts/setup-db.js')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ TURSO_AUTH_TOKEN must be set in your .env file or environment variables.'
      )
      expect(mockProcess.exit).toHaveBeenCalledWith(1)
    })

    it('should proceed with setup when both environment variables are present', async () => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com',
        TURSO_AUTH_TOKEN: 'test-token'
      }

      readFileSync.mockReturnValue('CREATE TABLE test;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Schema execution
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] }) // Verification query

      await import('../../scripts/setup-db.js')

      expect(createClient).toHaveBeenCalledWith({
        url: 'libsql://test-db.com',
        authToken: 'test-token'
      })
    })
  })

  describe('Database Client Creation', () => {
    beforeEach(() => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com',
        TURSO_AUTH_TOKEN: 'test-token'
      }
    })

    it('should create client with correct configuration', async () => {
      readFileSync.mockReturnValue('CREATE TABLE test;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] })

      await import('../../scripts/setup-db.js')

      expect(createClient).toHaveBeenCalledWith({
        url: 'libsql://test-db.com',
        authToken: 'test-token'
      })
    })
  })

  describe('Schema File Loading', () => {
    beforeEach(() => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com',
        TURSO_AUTH_TOKEN: 'test-token'
      }
    })

    it('should read schema file from correct path', async () => {
      const expectedPath = expect.stringContaining('db/schema.sql')
      readFileSync.mockReturnValue('CREATE TABLE test;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] })

      await import('../../scripts/setup-db.js')

      expect(readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8')
    })

    it('should handle file read errors gracefully', async () => {
      readFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      await import('../../scripts/setup-db.js')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Failed to setup database schema:',
        'File not found'
      )
      expect(mockProcess.exit).toHaveBeenCalledWith(1)
    })
  })

  describe('SQL Execution', () => {
    beforeEach(() => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com',
        TURSO_AUTH_TOKEN: 'test-token'
      }
    })

    it('should execute schema SQL successfully', async () => {
      const testSchema = 'CREATE TABLE messages (id INTEGER PRIMARY KEY);'
      readFileSync.mockReturnValue(testSchema)
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] })

      await import('../../scripts/setup-db.js')

      expect(mockClient.execute).toHaveBeenCalledWith(testSchema.trim())
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Database schema installed successfully!')
      expect(mockConsole.log).toHaveBeenCalledWith('   Rows affected:', 1)
    })

    it('should verify table creation after schema execution', async () => {
      readFileSync.mockReturnValue('CREATE TABLE messages;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] })

      await import('../../scripts/setup-db.js')

      expect(mockClient.execute).toHaveBeenCalledWith(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
      )
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Verified: messages table exists')
    })

    it('should warn when table verification fails', async () => {
      readFileSync.mockReturnValue('CREATE TABLE messages;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [] }) // No table found

      await import('../../scripts/setup-db.js')

      expect(mockConsole.log).toHaveBeenCalledWith('⚠️  Warning: messages table not found after creation')
    })

    it('should handle SQL execution errors', async () => {
      readFileSync.mockReturnValue('INVALID SQL;')
      mockClient.execute.mockRejectedValue(new Error('SQL syntax error'))

      await import('../../scripts/setup-db.js')

      expect(mockConsole.error).toHaveBeenCalledWith(
        '❌ Failed to setup database schema:',
        'SQL syntax error'
      )
      expect(mockProcess.exit).toHaveBeenCalledWith(1)
    })

    it('should handle errors with cause property', async () => {
      readFileSync.mockReturnValue('CREATE TABLE test;')
      const error = new Error('Database error')
      error.cause = new Error('Connection timeout')
      mockClient.execute.mockRejectedValue(error)

      await import('../../scripts/setup-db.js')

      expect(mockConsole.error).toHaveBeenCalledWith('❌ Failed to setup database schema:', 'Database error')
      expect(mockConsole.error).toHaveBeenCalledWith('   Cause:', 'Connection timeout')
    })
  })

  describe('Process Exit Handling', () => {
    beforeEach(() => {
      mockProcess.env = {
        TURSO_DATABASE_URL: 'libsql://test-db.com',
        TURSO_AUTH_TOKEN: 'test-token'
      }
    })

    it('should exit with code 0 on successful setup', async () => {
      readFileSync.mockReturnValue('CREATE TABLE messages;')
      mockClient.execute
        .mockResolvedValueOnce({ rowsAffected: 1 })
        .mockResolvedValueOnce({ rows: [{ name: 'messages' }] })

      await import('../../scripts/setup-db.js')

      expect(mockProcess.exit).toHaveBeenCalledWith(0)
    })

    it('should exit with code 1 on error', async () => {
      readFileSync.mockReturnValue('CREATE TABLE messages;')
      mockClient.execute.mockRejectedValue(new Error('Database error'))

      await import('../../scripts/setup-db.js')

      expect(mockProcess.exit).toHaveBeenCalledWith(1)
    })
  })
})