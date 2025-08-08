import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the @libsql/client module
const mockClient = {
  execute: vi.fn(),
  close: vi.fn(),
}

const mockCreateClient = vi.fn(() => mockClient)

vi.mock('@libsql/client', () => ({
  createClient: mockCreateClient,
}))

describe('Database Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Client Creation', () => {
    it('should create client with valid URL and auth token', async () => {
      const { createClient } = await import('@libsql/client')
      
      const config = {
        url: 'libsql://test-database.turso.io',
        authToken: 'test-auth-token'
      }
      
      const client = createClient(config)
      
      expect(createClient).toHaveBeenCalledWith(config)
      expect(client).toBe(mockClient)
    })

    it('should create client with local database URL', async () => {
      const { createClient } = await import('@libsql/client')
      
      const config = {
        url: 'file:local.db',
        authToken: null
      }
      
      const client = createClient(config)
      
      expect(createClient).toHaveBeenCalledWith(config)
      expect(client).toBe(mockClient)
    })

    it('should handle different URL formats', async () => {
      const { createClient } = await import('@libsql/client')
      
      const configs = [
        { url: 'libsql://db.turso.io', authToken: 'token1' },
        { url: 'http://localhost:8080', authToken: 'token2' },
        { url: 'https://db.example.com', authToken: 'token3' },
        { url: 'file:./test.db', authToken: null }
      ]
      
      configs.forEach(config => {
        createClient(config)
        expect(createClient).toHaveBeenCalledWith(config)
      })
      
      expect(createClient).toHaveBeenCalledTimes(configs.length)
    })
  })

  describe('Query Execution', () => {
    beforeEach(() => {
      mockClient.execute.mockClear()
    })

    it('should execute simple SELECT queries', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const expectedResult = {
        rows: [{ id: 1, name: 'test' }],
        rowsAffected: 0,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(expectedResult)
      
      const result = await client.execute('SELECT * FROM messages')
      
      expect(mockClient.execute).toHaveBeenCalledWith('SELECT * FROM messages')
      expect(result).toEqual(expectedResult)
    })

    it('should execute CREATE TABLE statements', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const createTableSQL = `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      )`
      
      const expectedResult = {
        rows: [],
        rowsAffected: 1,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(expectedResult)
      
      const result = await client.execute(createTableSQL)
      
      expect(mockClient.execute).toHaveBeenCalledWith(createTableSQL)
      expect(result.rowsAffected).toBe(1)
    })

    it('should execute INSERT statements', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const insertSQL = "INSERT INTO messages (name, email, message) VALUES ('John', 'john@example.com', 'Hello')"
      
      const expectedResult = {
        rows: [],
        rowsAffected: 1,
        lastInsertRowid: 123
      }
      
      mockClient.execute.mockResolvedValue(expectedResult)
      
      const result = await client.execute(insertSQL)
      
      expect(mockClient.execute).toHaveBeenCalledWith(insertSQL)
      expect(result.rowsAffected).toBe(1)
      expect(result.lastInsertRowid).toBe(123)
    })

    it('should execute CREATE INDEX statements', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const indexSQL = 'CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email)'
      
      const expectedResult = {
        rows: [],
        rowsAffected: 1,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(expectedResult)
      
      const result = await client.execute(indexSQL)
      
      expect(mockClient.execute).toHaveBeenCalledWith(indexSQL)
      expect(result.rowsAffected).toBe(1)
    })

    it('should handle schema verification queries', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const verifySQL = "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
      
      const expectedResult = {
        rows: [{ name: 'messages' }],
        rowsAffected: 0,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(expectedResult)
      
      const result = await client.execute(verifySQL)
      
      expect(mockClient.execute).toHaveBeenCalledWith(verifySQL)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].name).toBe('messages')
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const { createClient } = await import('@libsql/client')
      
      mockCreateClient.mockImplementation(() => {
        throw new Error('Connection failed')
      })
      
      expect(() => {
        createClient({ url: 'invalid://url', authToken: 'token' })
      }).toThrow('Connection failed')
    })

    it('should handle SQL syntax errors', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      mockClient.execute.mockRejectedValue(new Error('SQL syntax error'))
      
      await expect(client.execute('INVALID SQL')).rejects.toThrow('SQL syntax error')
    })

    it('should handle permission errors', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'invalid-token' })
      
      mockClient.execute.mockRejectedValue(new Error('Unauthorized'))
      
      await expect(client.execute('SELECT * FROM messages')).rejects.toThrow('Unauthorized')
    })

    it('should handle network timeout errors', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const timeoutError = new Error('Connection timeout')
      timeoutError.code = 'TIMEOUT'
      mockClient.execute.mockRejectedValue(timeoutError)
      
      await expect(client.execute('SELECT 1')).rejects.toThrow('Connection timeout')
    })

    it('should handle database locked errors', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const lockedError = new Error('Database is locked')
      lockedError.code = 'SQLITE_BUSY'
      mockClient.execute.mockRejectedValue(lockedError)
      
      await expect(client.execute('INSERT INTO messages VALUES (1, "test")')).rejects.toThrow('Database is locked')
    })
  })

  describe('Connection Management', () => {
    it('should provide close method', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      mockClient.close.mockResolvedValue(undefined)
      
      await client.close()
      
      expect(mockClient.close).toHaveBeenCalledOnce()
    })

    it('should handle close errors gracefully', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      mockClient.close.mockRejectedValue(new Error('Close failed'))
      
      await expect(client.close()).rejects.toThrow('Close failed')
    })
  })

  describe('Transaction Support', () => {
    it('should handle transaction queries', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      mockClient.execute
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowsAffected: 1 }) // INSERT
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 }) // COMMIT
      
      await client.execute('BEGIN TRANSACTION')
      await client.execute('INSERT INTO messages (name) VALUES ("test")')
      await client.execute('COMMIT')
      
      expect(mockClient.execute).toHaveBeenCalledTimes(3)
      expect(mockClient.execute).toHaveBeenNthCalledWith(1, 'BEGIN TRANSACTION')
      expect(mockClient.execute).toHaveBeenNthCalledWith(3, 'COMMIT')
    })

    it('should handle rollback operations', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      mockClient.execute
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 }) // BEGIN
        .mockRejectedValueOnce(new Error('Constraint violation')) // INSERT fails
        .mockResolvedValueOnce({ rows: [], rowsAffected: 0 }) // ROLLBACK
      
      await client.execute('BEGIN TRANSACTION')
      
      try {
        await client.execute('INSERT INTO messages (name) VALUES (NULL)') // This should fail
      } catch (error) {
        await client.execute('ROLLBACK')
      }
      
      expect(mockClient.execute).toHaveBeenCalledWith('ROLLBACK')
    })
  })

  describe('Result Set Handling', () => {
    it('should handle empty result sets', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const emptyResult = {
        rows: [],
        rowsAffected: 0,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(emptyResult)
      
      const result = await client.execute('SELECT * FROM messages WHERE id = 999')
      
      expect(result.rows).toHaveLength(0)
      expect(result.rowsAffected).toBe(0)
    })

    it('should handle large result sets', async () => {
      const { createClient } = await import('@libsql/client')
      const client = createClient({ url: 'libsql://test.db', authToken: 'token' })
      
      const largeResult = {
        rows: Array(1000).fill(0).map((_, i) => ({ id: i, name: `user${i}` })),
        rowsAffected: 0,
        lastInsertRowid: null
      }
      
      mockClient.execute.mockResolvedValue(largeResult)
      
      const result = await client.execute('SELECT * FROM messages')
      
      expect(result.rows).toHaveLength(1000)
      expect(result.rows[0]).toEqual({ id: 0, name: 'user0' })
      expect(result.rows[999]).toEqual({ id: 999, name: 'user999' })
    })
  })
})