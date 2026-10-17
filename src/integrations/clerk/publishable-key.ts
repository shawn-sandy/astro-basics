import { loadEnv } from 'vite'

/**
 * Reads `PUBLIC_CLERK_PUBLISHABLE_KEY` while `astro.config.mjs` loads. Astro has not put `.env`
 * into `process.env` yet at that point, so this reads the same sources it will: `process.env`
 * (a host's build variables, which win), then `.env` files under `root`.
 *
 * The mode picks `.env.<mode>`: `--mode` when the CLI was given one, as Astro does, otherwise
 * NODE_ENV, which `astro dev` and `astro build` set before the config loads.
 */
export function readPublishableKey(
  argv: string[] = process.argv,
  root: string = process.cwd()
): string | undefined {
  const mode = argv.join(' ').match(/--mode[= ](\S+)/)?.[1] ?? process.env.NODE_ENV ?? 'production'
  return loadEnv(mode, root, '').PUBLIC_CLERK_PUBLISHABLE_KEY
}
