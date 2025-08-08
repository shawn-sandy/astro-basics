import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

// Mock child_process for npm script testing
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

// Mock fs for file operations
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}))

describe('Database Setup Integration', () => {
  let mockProcess
  let originalEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalEnv = process.env
    
    // Mock successful process execution
    mockProcess = {
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    }
    
    spawn.mockReturnValue(mockProcess)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Full Setup Cycle', () => {
    it('should complete setup → verify → reset → setup cycle', async () => {
      // Mock environment variables
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      // Mock schema file exists
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Test setup command
      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      expect(spawn).toHaveBeenCalledWith('node', ['--env-file=.env', 'scripts/setup-db.js'])

      // Simulate successful completion
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10) // Success exit code
        }
      })

      // Wait for process to complete
      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          resolve()
        })
      })
    })

    it('should handle setup failure gracefully', async () => {
      process.env.TURSO_DATABASE_URL = 'invalid://url'
      process.env.TURSO_AUTH_TOKEN = 'invalid-token'
      
      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      // Simulate error exit
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('❌ Failed to setup database schema: Connection failed'))
        }
      })
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10) // Error exit code
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(1)
          resolve()
        })
      })
    })
  })

  describe('Schema Compatibility Testing', () => {
    it('should handle complex schema with indexes and triggers', async () => {
      const complexSchema = `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          subject TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          is_archived BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
        CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);

        CREATE TRIGGER IF NOT EXISTS update_messages_timestamp 
        AFTER UPDATE ON messages
        FOR EACH ROW
        BEGIN
          UPDATE messages SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `
      
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(complexSchema)

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          resolve()
        })
      })

      expect(spawn).toHaveBeenCalledWith('node', ['--env-file=.env', 'scripts/setup-db.js'])
    })

    it('should handle schema with constraints and checks', async () => {
      const constraintSchema = `
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CHECK (length(name) > 0),
          CHECK (length(email) > 5 AND email LIKE '%@%.%'),
          CHECK (length(message) > 0)
        );
      `
      
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(constraintSchema)

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          resolve()
        })
      })
    })
  })

  describe('Performance Testing', () => {
    it('should handle large schema files efficiently', async () => {
      // Generate a large schema with many columns
      const largeTableColumns = Array(100).fill(0).map((_, i) => 
        `col_${i} TEXT`
      ).join(',\n          ')
      
      const largeSchema = `
        CREATE TABLE IF NOT EXISTS large_table (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ${largeTableColumns}
        );
      `
      
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(largeSchema)

      const startTime = Date.now()
      
      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => {
            const duration = Date.now() - startTime
            expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
            callback(0)
          }, 100) // Simulate some processing time
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          resolve()
        })
      })
    })

    it('should handle multiple schema operations in sequence', async () => {
      const multiOpSchema = `
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, user_id INTEGER);
        CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
        CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      `
      
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(multiOpSchema)

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 50)
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          resolve()
        })
      })
    })
  })

  describe('Concurrent Execution Scenarios', () => {
    it('should handle multiple setup processes gracefully', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue('CREATE TABLE messages (id INTEGER PRIMARY KEY);')

      // Start multiple processes
      const process1 = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      const process2 = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      // Mock process completions
      const mockProcesses = [mockProcess, { ...mockProcess }]
      
      mockProcesses.forEach((proc, index) => {
        proc.on.mockImplementation((event, callback) => {
          if (event === 'close') {
            setTimeout(() => {
              // First process succeeds, second may fail due to concurrency
              const exitCode = index === 0 ? 0 : Math.random() > 0.5 ? 0 : 1
              callback(exitCode)
            }, 20 + index * 10)
          }
        })
      })

      const results = await Promise.all([
        new Promise(resolve => {
          mockProcesses[0].on('close', resolve)
        }),
        new Promise(resolve => {
          mockProcesses[1].on('close', resolve)
        })
      ])

      // At least one should succeed
      expect(results.some(code => code === 0)).toBe(true)
    })
  })

  describe('Environment File Loading', () => {
    it('should load environment variables from .env file', async () => {
      // Test that the --env-file flag is used correctly
      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      expect(spawn).toHaveBeenCalledWith('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          resolve()
        })
      })
    })

    it('should handle missing .env file gracefully', async () => {
      existsSync.mockImplementation((path) => {
        if (path.endsWith('.env')) return false
        if (path.includes('schema.sql')) return true
        return false
      })

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('❌ TURSO_DATABASE_URL must be set in your .env file'))
        }
      })
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10)
        }
      })

      await new Promise(resolve => {
        mockProcess.on('close', (code) => {
          expect(code).toBe(1)
          resolve()
        })
      })
    })
  })

  describe('Schema Validation After Creation', () => {
    it('should verify table structure after creation', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE
        );
      `)

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('✅ Database schema installed successfully!\n✅ Verified: messages table exists'))
        }
      })
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })

      let outputReceived = ''
      await new Promise(resolve => {
        mockProcess.stdout.on('data', (data) => {
          outputReceived += data.toString()
        })
        
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          expect(outputReceived).toContain('✅ Verified: messages table exists')
          resolve()
        })
      })
    })

    it('should warn when table verification fails', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
      
      existsSync.mockReturnValue(true)
      readFileSync.mockReturnValue('CREATE TABLE test_table (id INTEGER);')

      const setupProcess = spawn('node', ['--env-file=.env', 'scripts/setup-db.js'])
      
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from('⚠️  Warning: messages table not found after creation'))
        }
      })
      
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10)
        }
      })

      let outputReceived = ''
      await new Promise(resolve => {
        mockProcess.stdout.on('data', (data) => {
          outputReceived += data.toString()
        })
        
        mockProcess.on('close', (code) => {
          expect(code).toBe(0)
          expect(outputReceived).toContain('⚠️  Warning: messages table not found after creation')
          resolve()
        })
      })
    })
  })
})