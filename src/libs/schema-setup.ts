import getTursoClient from './turso'

export interface Message {
  id: number
  name: string
  email: string
  subject: string | null
  message: string
  is_read: boolean
  is_archived: boolean
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

export interface SchemaSetupResult {
  success: boolean
  message: string
  error?: Error
}

export async function setupDatabaseSchema(): Promise<SchemaSetupResult> {
  try {
    const schema = `
  -- Messages table for contact form submissions
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(length(name) <= 255),
    email TEXT NOT NULL CHECK(email GLOB '*@*.*'),
    subject TEXT CHECK(length(subject) <= 500),
    message TEXT NOT NULL CHECK(length(message) <= 5000),
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    ip_address TEXT CHECK(length(ip_address) <= 45),
    user_agent TEXT CHECK(length(user_agent) <= 500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_messages_email ON messages(email);
  CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_is_archived ON messages(is_archived);

  -- Trigger to update the updated_at timestamp
  CREATE TRIGGER IF NOT EXISTS update_messages_timestamp
  AFTER UPDATE ON messages
  FOR EACH ROW
  BEGIN
    UPDATE messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`

    const client = getTursoClient()
    await client.execute(schema)

    return {
      success: true,
      message: 'Database schema installed successfully',
    }
  } catch (error) {
    console.error('Failed to setup database schema:', error)
    return {
      success: false,
      message: 'Failed to setup database schema',
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

export async function checkSchemaExists(): Promise<boolean> {
  try {
    const client = getTursoClient()
    const result = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='messages';"
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('Failed to check schema existence:', error)
    return false
  }
}

export async function dropSchema(): Promise<SchemaSetupResult> {
  try {
    const client = getTursoClient()
    await client.execute('DROP TABLE IF EXISTS messages;')
    return {
      success: true,
      message: 'Schema dropped successfully',
    }
  } catch (error) {
    console.error('Failed to drop schema:', error)
    return {
      success: false,
      message: 'Failed to drop schema',
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

export async function resetSchema(): Promise<SchemaSetupResult> {
  const dropResult = await dropSchema()
  if (!dropResult.success) {
    return dropResult
  }
  return await setupDatabaseSchema()
}
