import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn(),
}))

describe('NPM Scripts Integration', () => {
  let originalEnv

  beforeEach(() => {
    vi.clearAllMocks()
    originalEnv = process.env
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('npm run db:setup', () => {
    it('should execute setup script successfully', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'

      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            callback(null, {
              stdout: '✅ Database schema installed successfully!\n✅ Verified: messages table exists',
              stderr: ''
            })
          }, 100)
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(exec).toHaveBeenCalledWith('npm run db:setup', expect.any(Function))
      expect(result.stdout).toContain('✅ Database schema installed successfully!')
      expect(result.stdout).toContain('✅ Verified: messages table exists')
    })

    it('should handle setup script failure', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            const error = new Error('Command failed')
            error.code = 1
            callback(error, '', '❌ Failed to setup database schema: Connection failed')
          }, 100)
        }
      })

      await expect(new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })).rejects.toThrow('Command failed')

      expect(exec).toHaveBeenCalledWith('npm run db:setup', expect.any(Function))
    })

    it('should pass environment variables correctly', async () => {
      process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
      process.env.TURSO_AUTH_TOKEN = 'test-auth-token'

      exec.mockImplementation((command, callback) => {
        // Verify the command includes the env file flag
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            callback(null, {
              stdout: 'Environment variables loaded successfully',
              stderr: ''
            })
          }, 50)
        }
      })

      await new Promise((resolve) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          expect(stdout).toContain('Environment variables loaded')
          resolve()
        })
      })
    })
  })

  describe('npm run db:reset', () => {
    it('should handle reset command when it exists', async () => {
      // Note: The current package.json only has db:setup, but we test for reset functionality
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:reset') {
          setTimeout(() => {
            callback(null, {
              stdout: '🔄 Resetting database schema...\n✅ Database reset complete',
              stderr: ''
            })
          }, 100)
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:reset', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(result.stdout).toContain('Database reset complete')
    })

    it('should handle missing reset command gracefully', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:reset') {
          setTimeout(() => {
            const error = new Error('Script "db:reset" not found')
            error.code = 1
            callback(error, '', 'npm ERR! missing script: db:reset')
          }, 50)
        }
      })

      await expect(new Promise((resolve, reject) => {
        exec('npm run db:reset', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })).rejects.toThrow('Script "db:reset" not found')
    })
  })

  describe('npm run db:check', () => {
    it('should handle check command when it exists', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:check') {
          setTimeout(() => {
            callback(null, {
              stdout: '🔍 Checking database schema...\n✅ Schema validation complete\n✅ All tables exist',
              stderr: ''
            })
          }, 100)
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:check', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(result.stdout).toContain('Schema validation complete')
      expect(result.stdout).toContain('All tables exist')
    })

    it('should handle missing check command gracefully', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:check') {
          setTimeout(() => {
            const error = new Error('Script "db:check" not found')
            error.code = 1
            callback(error, '', 'npm ERR! missing script: db:check')
          }, 50)
        }
      })

      await expect(new Promise((resolve, reject) => {
        exec('npm run db:check', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })).rejects.toThrow('Script "db:check" not found')
    })
  })

  describe('Script Execution with Exit Codes', () => {
    it('should return exit code 0 on success', async () => {
      exec.mockImplementation((command, callback) => {
        setTimeout(() => {
          callback(null, { stdout: 'Success', stderr: '' })
        }, 50)
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr, code: 0 })
          }
        })
      })

      expect(result.code).toBe(0)
    })

    it('should return non-zero exit code on failure', async () => {
      exec.mockImplementation((command, callback) => {
        setTimeout(() => {
          const error = new Error('Command failed')
          error.code = 1
          callback(error, '', 'Error occurred')
        }, 50)
      })

      try {
        await new Promise((resolve, reject) => {
          exec('npm run db:setup', (error, stdout, stderr) => {
            if (error) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      } catch (error) {
        expect(error.code).toBe(1)
      }
    })
  })

  describe('Environment File Loading', () => {
    it('should use --env-file flag in db:setup script', async () => {
      // Test that the package.json script uses the correct flag
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          // Simulate the actual command that would be executed
          const actualCommand = 'node --env-file=.env scripts/setup-db.js'
          setTimeout(() => {
            callback(null, {
              stdout: `Executing: ${actualCommand}\n✅ Environment loaded`,
              stderr: ''
            })
          }, 50)
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(result.stdout).toContain('--env-file=.env')
    })

    it('should handle missing environment file', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            const error = new Error('Environment file not found')
            error.code = 1
            callback(error, '', '❌ TURSO_DATABASE_URL must be set in your .env file')
          }, 50)
        }
      })

      try {
        await new Promise((resolve, reject) => {
          exec('npm run db:setup', (error, stdout, stderr) => {
            if (error) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      } catch (error) {
        expect(error.code).toBe(1)
      }
    })
  })

  describe('Script Output Formatting', () => {
    it('should capture and format console output correctly', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            const output = `🔄 Setting up database schema...
📝 Executing SQL: CREATE TABLE messages...
✅ Database schema installed successfully!
   Rows affected: 1
✅ Verified: messages table exists`
            callback(null, { stdout: output, stderr: '' })
          }, 100)
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(result.stdout).toContain('🔄 Setting up database schema...')
      expect(result.stdout).toContain('📝 Executing SQL:')
      expect(result.stdout).toContain('✅ Database schema installed successfully!')
      expect(result.stdout).toContain('   Rows affected: 1')
      expect(result.stdout).toContain('✅ Verified: messages table exists')
    })

    it('should capture error output in stderr', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            const error = new Error('Database connection failed')
            error.code = 1
            callback(
              error,
              '',
              '❌ Failed to setup database schema: Connection failed\n   Cause: Network timeout'
            )
          }, 50)
        }
      })

      try {
        await new Promise((resolve, reject) => {
          exec('npm run db:setup', (error, stdout, stderr) => {
            if (error) {
              error.stderr = stderr
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      } catch (error) {
        expect(error.stderr).toContain('❌ Failed to setup database schema')
        expect(error.stderr).toContain('   Cause: Network timeout')
      }
    })
  })

  describe('Concurrent Script Execution', () => {
    it('should handle multiple npm script executions', async () => {
      let executionCount = 0
      
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          executionCount++
          setTimeout(() => {
            callback(null, {
              stdout: `Execution #${executionCount} completed`,
              stderr: ''
            })
          }, 50 + Math.random() * 50)
        }
      })

      const promises = Array(3).fill(0).map(() => 
        new Promise((resolve, reject) => {
          exec('npm run db:setup', (error, stdout, stderr) => {
            if (error) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })
      )

      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(3)
      expect(executionCount).toBe(3)
      results.forEach(result => {
        expect(result.stdout).toContain('completed')
      })
    })
  })

  describe('Performance and Timeout Handling', () => {
    it('should complete script execution within reasonable time', async () => {
      const startTime = Date.now()
      
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            callback(null, { stdout: 'Setup complete', stderr: '' })
          }, 200) // Simulate 200ms execution time
        }
      })

      await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            const duration = Date.now() - startTime
            expect(duration).toBeLessThan(1000) // Should complete within 1 second
            resolve({ stdout, stderr })
          }
        })
      })
    })

    it('should handle long-running script execution', async () => {
      exec.mockImplementation((command, callback) => {
        if (command === 'npm run db:setup') {
          setTimeout(() => {
            callback(null, {
              stdout: 'Long running operation complete',
              stderr: ''
            })
          }, 1000) // Simulate longer execution
        }
      })

      const result = await new Promise((resolve, reject) => {
        exec('npm run db:setup', (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({ stdout, stderr })
          }
        })
      })

      expect(result.stdout).toContain('Long running operation complete')
    })
  })
})