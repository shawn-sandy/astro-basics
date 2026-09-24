/**
 * .env file helpers for the database setup wizard (scripts/setup-wizard.js).
 * Kept separate from the wizard so they can be imported without starting its prompts.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { parseEnv } from 'util'

/**
 * Read .env text, or '' when missing. Drops a leading BOM, which parseEnv would
 * otherwise glue onto the first key (dotenv, used by Vite, strips it).
 * @param {string} path
 */
const readEnvText = path =>
  existsSync(path) ? readFileSync(path, 'utf-8').replace(/^\uFEFF/, '') : ''

/**
 * Parse a .env file the same way `node --env-file` does (inline `# comments` stripped).
 * Returns {} when the file is missing.
 * @param {string} path
 * @returns {Record<string, string>}
 */
export function readEnvFile(path) {
  return parseEnv(readEnvText(path))
}

/**
 * Apply envVars to the .env file at path, touching only keys whose value changed.
 * A changed key is rewritten in place (keeping its inline comment) or appended;
 * a key set to undefined is removed. Every other line, comments included, is left as is,
 * so passing a partial or empty map never drops keys.
 * @param {string} path
 * @param {Record<string, string | undefined>} envVars
 */
export function updateEnvFile(path, envVars) {
  const content = readEnvText(path)
  const eol = content.includes('\r\n') ? '\r\n' : '\n'
  const current = parseEnv(content)
  let lines = content.split(/\r?\n/)

  for (const [key, value] of Object.entries(envVars)) {
    if (value === current[key]) continue

    // KEY=value [# comment], with optional `export` and a quoted or unquoted value.
    // ponytail: line-based, so multi-line quoted values are not handled; none of the wizard's
    // keys are multi-line. Rewrite by parsed line ranges if this helper gets other callers.
    const keyLine = new RegExp(
      `^(\\s*(?:export\\s+)?${key}\\s*=)(?:"(?:\\\\.|[^"\\\\])*"|'[^']*'|[^#]*?)(\\s*#.*)?$`
    )

    if (value === undefined) {
      lines = lines.filter(line => !keyLine.test(line))
    } else if (lines.some(line => keyLine.test(line))) {
      lines = lines.map(line =>
        line.replace(keyLine, (_, prefix, comment = '') => `${prefix}${value}${comment}`)
      )
    } else {
      // Append before the trailing newline, if there is one.
      lines.splice(lines.at(-1) === '' ? -1 : lines.length, 0, `${key}=${value}`)
    }
  }

  writeFileSync(path, lines.join(eol))
}
