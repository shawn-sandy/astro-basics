/**
 * Runtime template rendering.
 *
 * Deliberately supports only `{{ name }}` substitution, with HTML escaping that
 * cannot be turned off. The Netlify email integration renders templates with
 * Handlebars, where `{{{ raw }}}` bypasses escaping - a footgun when the values
 * come from a public contact form. Omitting the raw form removes that class of
 * injection entirely, at the cost of loops and conditionals in templates.
 *
 * @see project-docs/04-integrations/netlify-email/README.md
 */

/**
 * Matches `{{ name }}` / `{{name}}`.
 *
 * The brace boundaries matter: without them the inner `{{ name }}` of a
 * Handlebars-style `{{{ name }}}` would match, interpolating the value and
 * leaving stray braces around it. Requiring a non-brace on each side makes the
 * triple form inert, so a template carrying Handlebars' raw-output syntax
 * renders it literally instead of silently half-substituting.
 *
 * This is the single definition of the placeholder syntax. Build-time discovery
 * (`templates.ts`) and the dev preview both read it from here, so the syntax
 * cannot drift between what a template is scanned for and what is substituted.
 */
const PLACEHOLDER_PATTERN = /(?<!\{)\{\{\s*([a-zA-Z0-9_]+)\s*\}\}(?!\})/g

/**
 * Collect the placeholder names a template refers to.
 *
 * @param html Compiled template source.
 * @returns Each referenced name once, sorted for stable output.
 */
export function extractPlaceholders(html: string): string[] {
  const found = new Set<string>()
  for (const match of html.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1]
    if (name) found.add(name)
  }
  return [...found].sort()
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape a value for interpolation into HTML text or an attribute. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => HTML_ESCAPES[character] ?? character)
}

/** Values a template placeholder may be given. */
export type TemplateParameters = Record<string, string | number | string[]>

/**
 * Substitute parameters into a compiled template.
 *
 * Unknown placeholders render as an empty string rather than throwing: a missing
 * value should not turn a successful contact-form submission into an error.
 *
 * Arrays join with ", " - enough for the "list of items" case without pulling in
 * a full templating language.
 */
export function renderTemplate(html: string, parameters: TemplateParameters): string {
  return html.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    // `Object.hasOwn`, not `parameters[key] === undefined`: the placeholder
    // grammar accepts `constructor`, `toString` and `__proto__`, which resolve
    // on `Object.prototype` for any plain object. A bare lookup would mail
    // "function Object() { [native code] }" instead of rendering empty.
    if (!Object.hasOwn(parameters, key)) return ''
    const value = parameters[key]
    if (value === undefined) return ''
    const text = Array.isArray(value) ? value.join(', ') : String(value)
    return escapeHtml(text)
  })
}
