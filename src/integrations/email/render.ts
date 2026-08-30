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

/** Matches `{{ name }}` / `{{name}}`. */
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

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
 * value should not turn a successful contact-form submission into an error. The
 * build-time placeholder check in the integration is where drift gets reported.
 *
 * Arrays join with ", " - enough for the "list of items" case without pulling in
 * a full templating language.
 */
export function renderTemplate(html: string, parameters: TemplateParameters): string {
  return html.replace(PLACEHOLDER_PATTERN, (_match, key: string) => {
    const value = parameters[key]
    if (value === undefined) return ''
    const text = Array.isArray(value) ? value.join(', ') : String(value)
    return escapeHtml(text)
  })
}
