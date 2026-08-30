/**
 * `astro-email` - an Astro integration for version-controlled email templates.
 *
 * Replaces the Netlify email integration's build plugin with build-time work
 * that Astro is already doing, which resolves the three findings that blocked
 * adopting the Netlify version:
 *
 * - Templates are compiled and inlined into the server bundle, so no function
 *   needs `included_files` and no filesystem read happens at request time. The
 *   same build works on the netlify, node and vercel adapters.
 * - There is no hosted preview endpoint embedding a shared secret in its HTML;
 *   the preview route below is injected only under `astro dev`.
 * - It runs during `astro build`, so it does not depend on `netlify build`
 *   executing Netlify's build-plugin pipeline.
 *
 * @see project-docs/04-integrations/netlify-email/README.md
 * @example
 * // astro.config.mjs
 * import { astroEmail } from './src/integrations/email/index.ts'
 * export default defineConfig({ integrations: [astroEmail()] })
 */
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

import { loadTemplates } from '#integrations/email/templates'
import type { CompiledTemplate } from '#integrations/email/templates'

/** Options accepted by the integration factory. */
export type AstroEmailOptions = {
  /** Templates root, relative to the project root. Defaults to `emails`. */
  directory?: string
  /**
   * Serve the template preview under `astro dev`. Defaults to `true`.
   * Never injected for `astro build`, regardless of this value.
   */
  preview?: boolean
}

const VIRTUAL_MODULE_ID = 'virtual:astro-email/templates'
const RESOLVED_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

/** Serialize compiled templates into the virtual module's source. */
function buildVirtualModule(templates: CompiledTemplate[]): string {
  const entries = templates.map(
    template => `  ${JSON.stringify(template.name)}: ${JSON.stringify(template.html)},`
  )
  const names = templates.map(template => JSON.stringify(template.name))

  return [
    `export const templates = {`,
    ...entries,
    `}`,
    `export const templateNames = [${names.join(', ')}]`,
  ].join('\n')
}

/** Generate the ambient declaration that types the virtual module. */
function buildTypeDeclaration(templates: CompiledTemplate[]): string {
  const union =
    templates.length > 0
      ? templates.map(template => JSON.stringify(template.name)).join(' | ')
      : 'never'

  return [
    `declare module 'virtual:astro-email/templates' {`,
    `  /** Names of the templates found in the email directory at build time. */`,
    `  export type EmailTemplate = ${union}`,
    `  /** Compiled template HTML, keyed by template name. */`,
    `  export const templates: Record<EmailTemplate, string>`,
    `  /** Every known template name. */`,
    `  export const templateNames: EmailTemplate[]`,
    `}`,
    ``,
  ].join('\n')
}

/**
 * Create the email integration.
 *
 * @param options See {@link AstroEmailOptions}.
 */
export function astroEmail(options: AstroEmailOptions = {}): AstroIntegration {
  const directoryName = options.directory ?? 'emails'
  const wantsPreview = options.preview ?? true

  // Resolved in astro:config:setup, read again in astro:config:done.
  let templatesDir = ''
  let discovered: CompiledTemplate[] = []

  return {
    name: 'astro-email',
    hooks: {
      'astro:config:setup': async ({
        config,
        command,
        updateConfig,
        injectRoute,
        addWatchFile,
        logger,
      }) => {
        templatesDir = fileURLToPath(new URL(`${directoryName}/`, config.root))

        discovered = await loadTemplates(templatesDir)

        if (discovered.length === 0) {
          logger.warn(
            `No email templates found in "${directoryName}/". ` +
              `Add ${directoryName}/<name>/index.mjml or index.html to send mail.`
          )
        } else {
          logger.info(
            `Compiled ${discovered.length} email template(s): ` +
              discovered.map(template => template.name).join(', ')
          )
        }

        // Editing a template should rebuild the virtual module, not require a
        // manual dev-server restart.
        for (const template of discovered) {
          addWatchFile(`${templatesDir}${template.name}/index.mjml`)
          addWatchFile(`${templatesDir}${template.name}/index.html`)
        }

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'astro-email:templates',
                resolveId(id: string) {
                  return id === VIRTUAL_MODULE_ID ? RESOLVED_MODULE_ID : undefined
                },
                async load(id: string) {
                  if (id !== RESOLVED_MODULE_ID) return undefined
                  // Re-read on every load so dev picks up template edits.
                  return buildVirtualModule(await loadTemplates(templatesDir))
                },
              },
            ],
          },
        })

        // The preview renders templates with sample data and must never be
        // reachable in a deployed environment - that is precisely the mistake
        // the Netlify integration's preview makes on deploy previews.
        if (wantsPreview && command === 'dev') {
          injectRoute({
            pattern: '/_email/[...template]',
            entrypoint: new URL('./preview.ts', import.meta.url),
            prerender: false,
          })
          logger.info('Template preview available at /_email')
        }
      },

      'astro:config:done': ({ injectTypes }) => {
        injectTypes({
          filename: 'templates.d.ts',
          content: buildTypeDeclaration(discovered),
        })
      },
    },
  }
}
