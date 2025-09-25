import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Result type for environment parsing operations
 */
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: Error }

/**
 * Environment variable entry with metadata
 */
export interface EnvEntry {
  readonly key: string
  readonly value: string
  readonly hasComment: boolean
  readonly comment?: string
  readonly originalLine: string
  readonly lineNumber: number
}

/**
 * Configuration options for environment parsing
 */
export interface EnvParseOptions {
  readonly allowComments?: boolean
  readonly preserveWhitespace?: boolean
  readonly ignoreMalformed?: boolean
}

/**
 * Robust environment file parser that handles edge cases around environment variables
 * including whitespace variations, comments, and malformed entries.
 */
export class EnvParser {
  private readonly filePath: string
  private readonly options: Required<EnvParseOptions>

  constructor(filePath: string, options: EnvParseOptions = {}) {
    this.filePath = filePath
    this.options = {
      allowComments: options.allowComments ?? true,
      preserveWhitespace: options.preserveWhitespace ?? false,
      ignoreMalformed: options.ignoreMalformed ?? true,
    }
  }

  /**
   * Parse environment file and return all entries
   */
  parseFile(): ParseResult<readonly EnvEntry[]> {
    try {
      if (!existsSync(this.filePath)) {
        return { ok: false, error: new Error(`Environment file not found: ${this.filePath}`) }
      }

      const content = readFileSync(this.filePath, 'utf-8')
      return this.parseContent(content)
    } catch (error) {
      return { ok: false, error: error as Error }
    }
  }

  /**
   * Parse environment content string
   */
  parseContent(content: string): ParseResult<readonly EnvEntry[]> {
    try {
      const lines = content.split('\n')
      const entries: EnvEntry[] = []

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineNumber = i + 1

        // Skip empty lines
        if (!line.trim()) {
          continue
        }

        // Skip comment-only lines
        if (this.isCommentLine(line)) {
          continue
        }

        const parseResult = this.parseLine(line, lineNumber)
        if (parseResult.ok) {
          entries.push(parseResult.value)
        } else if (!this.options.ignoreMalformed) {
          return { ok: false, error: parseResult.error }
        }
      }

      return { ok: true, value: entries }
    } catch (error) {
      return { ok: false, error: error as Error }
    }
  }

  /**
   * Find a specific environment variable with robust matching
   */
  findVariable(key: string): ParseResult<EnvEntry | null> {
    const parseResult = this.parseFile()
    if (!parseResult.ok) {
      return parseResult
    }

    const entry = parseResult.value.find(entry => entry.key === key)
    return { ok: true, value: entry || null }
  }

  /**
   * Update or add an environment variable with proper formatting
   */
  updateVariable(key: string, value: string, comment?: string): ParseResult<void> {
    try {
      if (!existsSync(this.filePath)) {
        return { ok: false, error: new Error(`Environment file not found: ${this.filePath}`) }
      }

      const content = readFileSync(this.filePath, 'utf-8')
      const lines = content.split('\n')
      let updated = false

      // Try to update existing variable
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const parseResult = this.parseLine(line, i + 1)

        if (parseResult.ok && parseResult.value.key === key) {
          // Found the variable, update it
          lines[i] = this.formatEnvLine(key, value, comment)
          updated = true
          break
        }
      }

      // If not found, add it to the end
      if (!updated) {
        // Add empty line if file doesn't end with one
        if (lines[lines.length - 1]?.trim()) {
          lines.push('')
        }
        lines.push(this.formatEnvLine(key, value, comment))
      }

      writeFileSync(this.filePath, lines.join('\n'))
      return { ok: true, value: undefined }
    } catch (error) {
      return { ok: false, error: error as Error }
    }
  }

  /**
   * Parse a single line and extract environment variable information
   */
  private parseLine(line: string, lineNumber: number): ParseResult<EnvEntry> {
    const originalLine = line

    // Handle various comment styles and whitespace patterns
    // First, find the key and equals sign
    const keyMatch = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!keyMatch) {
      return {
        ok: false,
        error: new Error(`Malformed environment variable at line ${lineNumber}: ${line}`),
      }
    }

    const [, key, remainder] = keyMatch

    // Now parse the value and comment from the remainder
    let value = ''
    let comment: string | undefined

    // Handle different comment styles: # and //
    // But be careful not to match // inside URLs
    let commentMatch = remainder.match(/^(.*?)\s+#\s*(.*)$/)
    if (!commentMatch) {
      // For //, make sure it's at word boundary and not part of a URL
      // Look for // that's either at start of whitespace or after whitespace
      commentMatch = remainder.match(/^(.*?)\s+\/\/\s*(.*)$/)
    }

    // Also handle cases where the value is empty or just whitespace before comment
    if (!commentMatch) {
      // Check for # at the beginning or after only whitespace
      commentMatch = remainder.match(/^\s*#\s*(.*)$/)
      if (commentMatch) {
        value = ''
        comment = commentMatch[1].trim()
      }
    }

    if (commentMatch && !comment) {
      value = commentMatch[1].trim()
      comment = commentMatch[2].trim()
    } else if (!comment) {
      value = remainder.trim()
    }

    // Handle quoted values
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    return {
      ok: true,
      value: {
        key: key.trim(),
        value,
        hasComment: Boolean(comment),
        comment,
        originalLine,
        lineNumber,
      },
    }
  }

  /**
   * Check if a line is a comment-only line
   */
  private isCommentLine(line: string): boolean {
    const trimmed = line.trim()
    return trimmed.startsWith('#') || trimmed.startsWith('//')
  }

  /**
   * Format an environment variable line with proper spacing and comments
   */
  private formatEnvLine(key: string, value: string, comment?: string): string {
    // Escape value if it contains spaces or special characters
    const needsQuoting = /[\s#"'\\]/.test(value)
    const formattedValue = needsQuoting ? `"${value.replace(/"/g, '\\"')}"` : value

    const baseLine = `${key}=${formattedValue}`

    if (comment) {
      return `${baseLine} # ${comment}`
    }

    return baseLine
  }
}

/**
 * Convenience function to create an EnvParser for a specific file
 */
export const createEnvParser = (filePath: string, options?: EnvParseOptions): EnvParser => {
  return new EnvParser(filePath, options)
}

/**
 * Convenience function to parse the default .env file in the project root
 */
export const parseDefaultEnvFile = (
  options?: EnvParseOptions
): ParseResult<readonly EnvEntry[]> => {
  const envPath = join(process.cwd(), '.env')
  const parser = new EnvParser(envPath, options)
  return parser.parseFile()
}

/**
 * Convenience function to safely get a DATABASE_PROVIDER value with robust parsing
 */
export const getDatabaseProvider = (): ParseResult<string | null> => {
  const envPath = join(process.cwd(), '.env')
  const parser = new EnvParser(envPath)

  const result = parser.findVariable('DATABASE_PROVIDER')
  if (!result.ok) {
    return result
  }

  return { ok: true, value: result.value?.value || null }
}

/**
 * Convenience function to safely update DATABASE_PROVIDER with proper formatting
 */
export const updateDatabaseProvider = (provider: string, comment?: string): ParseResult<void> => {
  const envPath = join(process.cwd(), '.env')
  const parser = new EnvParser(envPath)

  return parser.updateVariable('DATABASE_PROVIDER', provider, comment)
}
