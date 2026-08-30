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
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Re-exported so the placeholder syntax has exactly one definition (render.ts),
// shared by build-time discovery, the dev preview, and runtime substitution.
export { extractPlaceholders } from '#integrations/email/render'

/** A template discovered on disk, already compiled to HTML. */
export type CompiledTemplate = {
  /** Directory name, used as the template's identifier. */
  name: string
  /** Fully compiled HTML, still containing `{{ placeholder }}` markers. */
  html: string
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

  // `withFileTypes`, not a `statSync` per entry: `statSync` follows symlinks and
  // throws ENOENT on a dangling one, which would abort `astro build` with a bare
  // path and no reason. A `Dirent` reports a broken link as "not a directory".
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const templateDir = join(directory, entry.name)

    const mjmlPath = join(templateDir, 'index.mjml')
    const htmlPath = join(templateDir, 'index.html')

    let html: string
    if (existsSync(mjmlPath)) {
      html = await compileMjml(readFileSync(mjmlPath, 'utf8'), entry.name)
    } else if (existsSync(htmlPath)) {
      html = readFileSync(htmlPath, 'utf8')
    } else {
      continue
    }

    compiled.push({ name: entry.name, html })
  }

  return compiled.sort((a, b) => a.name.localeCompare(b.name))
}
