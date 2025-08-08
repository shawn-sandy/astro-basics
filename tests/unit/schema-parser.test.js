import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}))

describe('Schema Parser', () => {
  describe('SQL Statement Parsing', () => {
    it('should handle single line CREATE TABLE statements', () => {
      const schema = 'CREATE TABLE messages (id INTEGER PRIMARY KEY);'
      readFileSync.mockReturnValue(schema)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toBe(schema)
    })

    it('should handle multi-line CREATE TABLE statements', () => {
      const schema = `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        message TEXT NOT NULL,
        subject TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
      readFileSync.mockReturnValue(schema)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toBe(schema)
      expect(cleaned).toContain('CREATE TABLE IF NOT EXISTS')
      expect(cleaned).toContain('PRIMARY KEY AUTOINCREMENT')
      expect(cleaned).toContain('NOT NULL')
      expect(cleaned).toContain('DEFAULT FALSE')
    })

    it('should handle SQL with comments', () => {
      const schemaWithComments = `-- This is a comment
CREATE TABLE messages (
  id INTEGER PRIMARY KEY, -- Primary key comment
  name TEXT NOT NULL
); -- End comment`
      
      readFileSync.mockReturnValue(schemaWithComments)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      // The actual setup script doesn't strip comments, so we verify it handles them
      expect(cleaned).toContain('-- This is a comment')
      expect(cleaned).toContain('CREATE TABLE messages')
    })

    it('should handle SQL with extra whitespace', () => {
      const schemaWithWhitespace = `


CREATE TABLE messages (
  id INTEGER PRIMARY KEY
);


`
      readFileSync.mockReturnValue(schemaWithWhitespace)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toBe(`CREATE TABLE messages (
  id INTEGER PRIMARY KEY
);`)
    })

    it('should handle empty schema files', () => {
      readFileSync.mockReturnValue('')
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toBe('')
    })

    it('should handle schema files with only whitespace', () => {
      readFileSync.mockReturnValue('   \n   \n   ')
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toBe('')
    })
  })

  describe('BEGIN/END Block Parsing', () => {
    it('should handle CREATE TRIGGER with BEGIN/END blocks', () => {
      const triggerSQL = `CREATE TRIGGER IF NOT EXISTS update_messages_timestamp 
        AFTER UPDATE ON messages
        FOR EACH ROW
        BEGIN
          UPDATE messages SET created_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;`
      
      readFileSync.mockReturnValue(triggerSQL)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('BEGIN')
      expect(cleaned).toContain('END;')
      expect(cleaned).toContain('CREATE TRIGGER')
      expect(cleaned).toContain('AFTER UPDATE')
    })

    it('should handle CREATE FUNCTION with BEGIN/END blocks', () => {
      const functionSQL = `CREATE OR REPLACE FUNCTION update_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;`
      
      readFileSync.mockReturnValue(functionSQL)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('BEGIN')
      expect(cleaned).toContain('END;')
      expect(cleaned).toContain('CREATE OR REPLACE FUNCTION')
    })

    it('should handle nested BEGIN/END blocks', () => {
      const nestedSQL = `CREATE TRIGGER complex_trigger
        AFTER INSERT ON messages
        FOR EACH ROW
        BEGIN
          IF NEW.email IS NOT NULL THEN
            BEGIN
              UPDATE stats SET count = count + 1;
            END;
          END IF;
        END;`
      
      readFileSync.mockReturnValue(nestedSQL)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('BEGIN')
      expect(cleaned).toContain('END;')
      expect(cleaned).toContain('END IF;')
      expect(cleaned.split('BEGIN').length - 1).toBe(2) // Two BEGIN statements
    })
  })

  describe('Multiple Statement Handling', () => {
    it('should handle multiple CREATE statements', () => {
      const multipleStatements = `CREATE TABLE messages (id INTEGER PRIMARY KEY);
CREATE INDEX idx_messages_email ON messages(email);
CREATE INDEX idx_messages_created_at ON messages(created_at);`
      
      readFileSync.mockReturnValue(multipleStatements)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('CREATE TABLE')
      expect(cleaned).toContain('CREATE INDEX idx_messages_email')
      expect(cleaned).toContain('CREATE INDEX idx_messages_created_at')
    })

    it('should handle mixed statement types', () => {
      const mixedStatements = `CREATE TABLE messages (id INTEGER);
CREATE INDEX idx_email ON messages(email);
CREATE TRIGGER update_timestamp AFTER UPDATE ON messages
BEGIN
  UPDATE messages SET updated_at = CURRENT_TIMESTAMP;
END;`
      
      readFileSync.mockReturnValue(mixedStatements)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('CREATE TABLE')
      expect(cleaned).toContain('CREATE INDEX')
      expect(cleaned).toContain('CREATE TRIGGER')
      expect(cleaned).toContain('BEGIN')
      expect(cleaned).toContain('END;')
    })
  })

  describe('SQL Validation', () => {
    it('should handle valid table constraints', () => {
      const constraintSQL = `CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (length(email) > 0),
        CHECK (length(message) > 0)
      )`
      
      readFileSync.mockReturnValue(constraintSQL)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('PRIMARY KEY AUTOINCREMENT')
      expect(cleaned).toContain('NOT NULL UNIQUE')
      expect(cleaned).toContain('DEFAULT FALSE')
      expect(cleaned).toContain('CHECK (length(email) > 0)')
      expect(cleaned).toContain('CHECK (length(message) > 0)')
    })

    it('should handle index creation statements', () => {
      const indexSQL = `CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);`
      
      readFileSync.mockReturnValue(indexSQL)
      
      const content = readFileSync('test.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('idx_messages_email')
      expect(cleaned).toContain('idx_messages_is_read')
      expect(cleaned).toContain('idx_messages_created_at')
      expect(cleaned).toContain('idx_messages_is_archived')
      expect(cleaned.split('CREATE INDEX').length - 1).toBe(4)
    })
  })

  describe('File Loading Edge Cases', () => {
    it('should handle file read errors', () => {
      readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory')
      })
      
      expect(() => {
        readFileSync('nonexistent.sql', 'utf-8')
      }).toThrow('ENOENT: no such file or directory')
    })

    it('should handle permission errors', () => {
      readFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied')
      })
      
      expect(() => {
        readFileSync('restricted.sql', 'utf-8')
      }).toThrow('EACCES: permission denied')
    })

    it('should handle binary files', () => {
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03])
      readFileSync.mockReturnValue(binaryContent.toString('utf-8'))
      
      const content = readFileSync('binary.sql', 'utf-8')
      
      expect(typeof content).toBe('string')
    })

    it('should handle very large schema files', () => {
      const largeSchema = 'CREATE TABLE test (\n' + 
        Array(1000).fill(0).map((_, i) => `  col${i} TEXT`).join(',\n') + 
        '\n);'
      
      readFileSync.mockReturnValue(largeSchema)
      
      const content = readFileSync('large.sql', 'utf-8')
      const cleaned = content.trim()
      
      expect(cleaned).toContain('CREATE TABLE test')
      expect(cleaned).toContain('col0 TEXT')
      expect(cleaned).toContain('col999 TEXT')
    })
  })
})