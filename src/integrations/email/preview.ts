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

import { renderTemplate, type TemplateParameters } from './render.js'

export const prerender = false

/** Substitute `[placeholder]` markers so the layout is visible without real data. */
function sampleParameters(html: string): TemplateParameters {
  const parameters: TemplateParameters = {}
  for (const match of html.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    const name = match[1]
    if (name) parameters[name] = `[${name}]`
  }
  return parameters
}

function indexPage(): string {
  const items = templateNames.map(name => `<li><a href="/_email/${name}">${name}</a></li>`).join('')

  return `<!doctype html><meta charset="utf-8"><title>Email templates</title>
    <h1>Email templates</h1>
    ${templateNames.length > 0 ? `<ul>${items}</ul>` : '<p>No templates found in <code>emails/</code>.</p>'}`
}

export const GET: APIRoute = ({ params }) => {
  const requested = params.template

  if (!requested) {
    return new Response(indexPage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const html = templates[requested as keyof typeof templates]

  if (!html) {
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
