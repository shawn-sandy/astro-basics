import client from './turso'

export interface SchemaSetupResult {
  success: boolean
  message: string
  error?: Error
}

export async function setupDatabaseSchema(): Promise<SchemaSetupResult> {
  try {
    const schema = `
      CREATE TABLE IF NOT EXISTS messages (
        name TEXT,
        email VARCHAR(255) PRIMARY KEY,
        message TEXT
      );
    `

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
