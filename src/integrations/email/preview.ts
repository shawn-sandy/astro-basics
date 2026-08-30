/**
 * Dev-only email template preview.
 *
 * Injected by the integration under `astro dev` only, so it cannot ship to a
 * deployed environment. It renders templates with placeholder-name stand-ins
 * rather than real data, and - unlike the Netlify integration's preview - it
 * has no secret to leak, because sending never goes through an HTTP endpoint.
 */
import type { APIRoute } from 'astro'
import { templates, templateNames } from 'virtual:astro-email/templates'

import { extractPlaceholders, renderTemplate } from '#integrations/email/render'
import type { TemplateParameters } from '#integrations/email/render'

export const prerender = false

/** Substitute `[placeholder]` markers so the layout is visible without real data. */
function sampleParameters(html: string): TemplateParameters {
  // Null prototype: the placeholder grammar accepts `__proto__`, and assigning
  // that key on a plain object hits the prototype setter instead of creating an
  // own property, so the preview would render it empty.
  const parameters: TemplateParameters = Object.create(null)
  for (const name of extractPlaceholders(html)) {
    parameters[name] = `[${name}]`
  }
  return parameters
}

function indexPage(): string {
  const items = templateNames.map(name => `<li><a href="/_email/${name}">${name}</a></li>`).join('')

  return `<!doctype html><meta charset="utf-8"><title>Email templates</title>
    <h1>Email templates</h1>
    ${templateNames.length > 0 ? `<ul>${items}</ul>` : '<p>No templates found in <code>emails/</code>.</p>'}`
}

/**
 * Render the template index, or one template with placeholder stand-ins.
 *
 * @route GET /_email/[...template]
 * @param params.template Template directory name; absent renders the index.
 * @returns 200 with HTML for the index or a known template; 404 when the
 * template name has no compiled template.
 */
export const GET: APIRoute = ({ params }) => {
  const requested = params.template

  if (!requested) {
    return new Response(indexPage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // `Object.hasOwn`, not a bare lookup: `templates` is an object literal, so
  // `templates.constructor` / `.toString` resolve on the prototype chain and
  // would hand a function to the renderer instead of returning 404.
  const html = Object.hasOwn(templates, requested)
    ? templates[requested as keyof typeof templates]
    : undefined

  // `=== undefined`, not falsy: an empty index.html compiles to '' and is a
  // real template, so only an unknown name is a 404.
  if (html === undefined) {
    return new Response(`Unknown template "${requested}". Known: ${templateNames.join(', ')}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new Response(renderTemplate(html, sampleParameters(html)), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
