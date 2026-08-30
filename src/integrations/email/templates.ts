/**
 * Build-time email template discovery and compilation.
 *
 * Runs inside the Astro build (Node), never at request time. Templates are read
 * from disk here, compiled once, and handed to the runtime as a bundled virtual
 * module - so the serverless function never touches the filesystem. That is the
 * main reason this is an Astro integration rather than a plain utility: it is
 * what lets the same code deploy to the netlify, node and vercel adapters
 * without per-adapter file-inclusion config.
 *
 * @see project-docs/04-integrations/netlify-email/README.md
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** A template discovered on disk, already compiled to HTML. */
export type CompiledTemplate = {
  /** Directory name, used as the template's identifier. */
  name: string
  /** Fully compiled HTML, still containing `{{ placeholder }}` markers. */
  html: string
  /** Placeholder names referenced by the template. */
  placeholders: string[]
}

/** Matches `{{ name }}` / `{{name}}`. Deliberately does not match `{{{ raw }}}`. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/**
 * Collect the placeholder names a template refers to.
 *
 * Used to warn at build time when a template and its call site have drifted
 * apart, which is otherwise only discoverable by sending a real email.
 */
export function extractPlaceholders(html: string): string[] {
  const found = new Set<string>()
  for (const match of html.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]
    if (name) found.add(name)
  }
  return [...found].sort()
}

/**
 * Compile MJML to HTML, loading the compiler lazily.
 *
 * `mjml` is an optional peer: HTML templates work with no extra dependency, and
 * the cost is only paid by projects that actually author `.mjml`. It is a
 * build-time dependency only - nothing from it reaches the server bundle.
 */
async function compileMjml(source: string, name: string): Promise<string> {
  type Mjml2Html = (input: string) => { html: string; errors: { formattedMessage: string }[] }
  let mjml2html: Mjml2Html

  try {
    // Indirect specifier on purpose: a literal would make TypeScript demand the
    // package be installed, which would defeat it being optional.
    const specifier = 'mjml'
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      default?: Mjml2Html
    } & Mjml2Html
    mjml2html = mod.default ?? (mod as Mjml2Html)
  } catch {
    throw new Error(
      `Template "${name}" is MJML, but the "mjml" package is not installed. ` +
        `Run \`npm install --save-dev mjml\`, or author the template as index.html instead.`
    )
  }

  const result = mjml2html(source)
  if (result.errors.length > 0) {
    const details = result.errors.map(error => error.formattedMessage).join('; ')
    throw new Error(`Template "${name}" failed to compile: ${details}`)
  }
  return result.html
}

/**
 * Discover and compile every template under `directory`.
 *
 * A template is a subdirectory containing `index.mjml` or `index.html`, matching
 * the layout the Netlify email integration uses, so templates stay portable
 * between the two approaches. `index.mjml` wins if both are present.
 *
 * @param directory Absolute path to the templates root (default `./emails`).
 * @returns Compiled templates, sorted by name for stable output.
 */
export async function loadTemplates(directory: string): Promise<CompiledTemplate[]> {
  if (!existsSync(directory)) return []

  const compiled: CompiledTemplate[] = []

  for (const entry of readdirSync(directory)) {
    const templateDir = join(directory, entry)
    if (!statSync(templateDir).isDirectory()) continue

    const mjmlPath = join(templateDir, 'index.mjml')
    const htmlPath = join(templateDir, 'index.html')

    let html: string
    if (existsSync(mjmlPath)) {
      html = await compileMjml(readFileSync(mjmlPath, 'utf8'), entry)
    } else if (existsSync(htmlPath)) {
      html = readFileSync(htmlPath, 'utf8')
    } else {
      continue
    }

    compiled.push({ name: entry, html, placeholders: extractPlaceholders(html) })
  }

  return compiled.sort((a, b) => a.name.localeCompare(b.name))
}
