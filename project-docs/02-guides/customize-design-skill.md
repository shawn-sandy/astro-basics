# Customize Design Skill

`customize-design` is a Claude skill in `.claude/skills/customize-design/`. It rebrands the Astro Kit design system:
the accent and neutral colours, the display font and the corner radius. It works in light and dark, and keeps the
design direction rules, the 4.5:1 contrast floor and `DESIGN.md` in step with the stylesheet.

Published guide: [/guide/customize-design](../../src/content/docs/guide/customize-design.mdx)

## Overview

The skill works from one principle: **the stylesheet is what ships, and `DESIGN.md` is the written spec**. It
changes `src/styles/_design-tokens.scss` first, measures the result with its contrast script, and only then rewrites
`DESIGN.md` and its two published copies to match. The ratios it writes come from measurement, not estimates.

It has two paths:

- **Path A, the whole site (default).** The seven direction tokens in both themes, then optionally the display font,
  the corner radius and the Starlight accent. Followed by a Sass rebuild, the design checks, and `DESIGN.md` brought
  in step.
- **Path B, a brand layer on some sections.** A scoped `[data-<brand>]` palette sheet that selected components opt
  into. Every other route keeps the kit's palette. Needs no Sass build.

The skill rebrands this checkout. A project that installs the kit as a package rebrands it by redefining the tokens
in its own stylesheet instead; see "Overriding the Tokens as a Consumer" in
[design-direction.md](../03-features/design-direction.md).

## Usage

Open Claude Code at the repository root and ask for the change. Claude loads the skill for requests about the site's
colours, fonts, theme or branding, or you can start it with `/customize-design`:

```text
Rebrand the site around #185c53 and make the corners sharper.
```

The skill asks five questions in one message:

| Question | What it decides                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------ |
| Scope    | The whole site (Path A, the default) or a brand layer on a few sections (Path B)                 |
| Colour   | One brand colour is enough, and the skill derives the rest. A logo works too: it reads the fills |
| Fonts    | Keep Inter, or name a display face you can self-host. Body and labels stay on system stacks      |
| Corners  | Keep 8px, go sharper, or go rounder                                                              |
| Name     | What the design system is called in `DESIGN.md`. The site title is separate, in `site-config.ts` |

## Where the Design Lives

| What                 | File                                                                                                                     | Edit                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Palette, both themes | `src/styles/_design-tokens.scss`                                                                                         | the seven tokens in `@mixin direction-light` and `@mixin direction-dark`                 |
| Fonts                | `src/styles/_design-tokens.scss`, `public/fonts/`, `src/layouts/Base.astro`                                              | `@font-face`, `--font-family-display` / `-sans` / `-mono`, the font preload `<link>`     |
| Corners              | `src/styles/_design-tokens.scss`                                                                                         | the `--radius-*` scale, plus `--radius` and `--btn-radius`                               |
| Docs site accent     | `src/styles/starlight-custom.scss`                                                                                       | `--sl-color-accent`, `-high`, `-low` and `--sl-color-text-accent`, light and dark blocks |
| Name, logo, favicon  | `src/utils/site-config.ts`, `public/`                                                                                    | `SITE_TITLE`, `SITE_LOGO`, `favicon.svg`                                                 |
| The written spec     | `DESIGN.md`                                                                                                              | frontmatter tokens and the prose that names them                                         |
| Copies of the spec   | `src/content/docs/guide/design-direction.mdx`, `project-docs/03-features/design-direction.md`, `.impeccable/design.json` | the token table, the colour names and the measured ratios                                |

The site loads the compiled `src/styles/index.css` (imported in `Base.astro`), not the SCSS, so a token edit changes
nothing until `npm run sass:build` runs. Starlight's sheet is compiled by Vite and needs no build step.

The skill leaves these alone:

- `--color-primary-*` (sky blue) and `--color-neutral-*` (greys), kept for the @fpkit/acss components. A sky blue
  reaching the screen is a regression, not a brand.
- `design-tokens.css`, `design-tokens.json` and `_component-sample-tokens.scss`, which were extracted from a sample
  file. The site never loads them.
- The literal fallbacks in `HomeHero.astro`, such as `var(--ink, #101418)`. They apply only when a token is missing.
- The status colours (success, warning, error, info). They signal state, not brand.

## Workflow

### Pre-flight

A rebuild writes over `index.css`, so before editing anything the skill checks that the rebuild will contain only
the rebrand:

1. `git status --short src/styles` must print nothing. Any output means uncommitted style work, and the skill stops
   and asks for it to be committed or set aside.
2. It rebuilds, runs Prettier on `index.css`, and checks that `index.css` and `index.css.map` are unchanged. Any
   change means the committed CSS had drifted from its SCSS (common in forks). The skill shows `git diff --stat` and
   asks whether to commit the rebuilt CSS on its own first, or to switch to Path B. For Path B it restores the
   committed CSS with `git restore src/styles/index.css src/styles/index.css.map`.
3. It runs the contrast script to record the starting figures.

### Path A: the whole site

1. **Pick the seven colours.** Derived from the brand colour and tried with the contrast script before any edit.

   | Token          | Role                                                | Light                                                        | Dark                           |
   | -------------- | --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
   | `--island`     | the accent                                          | the brand colour, dark enough for 4.5:1 on all three grounds | a lighter tint of the same hue |
   | `--island-bg`  | accent wash: hover fills, `::selection`, active nav | a very light tint of the hue                                 | a very dark shade of the hue   |
   | `--ink`        | text                                                | near-black, may lean toward the hue                          | near-white                     |
   | `--ink-soft`   | secondary text                                      | mid-grey; its pair with `--paper-sunk` is the tightest       | mid-grey, lighter              |
   | `--paper`      | page background                                     | near-white                                                   | near-black                     |
   | `--paper-sunk` | header band, cards, code blocks                     | one step darker than paper                                   | one step lighter than paper    |
   | `--rule`       | hairlines, never text                               | light grey                                                   | dark grey                      |

   A brand colour too light for text (yellow, light orange, any pastel) cannot be the accent. The skill uses a darker
   shade of its hue for `--island` and keeps the bright one for `--island-bg` or the logo. Hover and active states
   are mixed from `--island` with `color-mix()`, so there are no hover tokens.

2. **Edit the tokens** in `@mixin direction-light` and `@mixin direction-dark`, keeping the property names. The
   ratios in the comment above the mixins are replaced with the script's output. Optionally, Starlight's accent in
   `starlight-custom.scss` is repointed at the new hue, and `--sl-color-text-accent` is measured against
   `--sl-color-bg` and `--sl-color-bg-sidebar` in each block, since no test covers the docs.
3. **Fonts, only if asked.** One woff2 in `public/fonts/` (one weight, latin subset, licence checked), the
   `@font-face` and `--font-family-display` updated, and the preload `href` in `src/layouts/Base.astro` changed to
   match the `src` exactly. Headings render at weight 600 (`src/styles/_base.scss`), so a file in another weight
   needs that line changed too. `--font-family-sans` and `--font-family-mono` must stay different from the display
   family and from each other.
4. **Corners, only if asked.** See [Corners](#corners).
5. **Build and check.** See [Verification](#verification). Then a visual pass with `npm run dev` over the homepage,
   a blog post, `/guide/` and `/dashboard` (if login is on), in light and dark through both the theme toggle and the
   OS setting, and at 320px wide.
6. **Make `DESIGN.md` match.** Frontmatter (`name`, `description`, the seven `colors`, each
   `typography.*.fontFamily`, `rounded`, and component values that hardcode a colour such as
   `button-primary-hover.backgroundColor`), the colour names and descriptions in `## Colors`, the ratios, and
   `## Typography` or `## Shapes` if those changed. To find what is left, the skill runs a targeted search for
   six-digit hex values, decimal ratios, the current colour names and the display font, then decides each hit. The
   search is not exhaustive, so it reads the remaining values in `DESIGN.md` too:

   ```bash
   grep -nE '#[0-9a-fA-F]{6}\b|[0-9]+\.[0-9]+:1|Harbour|petrol|blue-green|teal' DESIGN.md
   grep -nw Inter DESIGN.md
   ```

   The same changes go into `src/content/docs/guide/design-direction.mdx` and
   `project-docs/03-features/design-direction.md`. `.impeccable/design.json` is generated by the impeccable plugin;
   the skill regenerates it if the plugin is present and otherwise says it is stale. The Named Rules stay unless the
   brand really breaks one.

7. **Re-sync the published design system (optional).** If the user has the `design-system-from-design-md` skill in
   `~/.claude/skills`, it is run with the URL of the Astro Kit artifact linked from the README, so the existing system
   is updated rather than a new one created. Without that skill, the skill says so and stops.

### Corners

| Token           | Size | Painted on                                                                            |
| --------------- | ---- | ------------------------------------------------------------------------------------- |
| `--radius-lg`   | 8px  | cards and the navigation toggle and panel (through `--card-radius`), dashboard panels |
| `--radius-md`   | 6px  | links in the navigation panel, dashboard quick-action buttons                         |
| `--radius-base` | 4px  | form inputs (through `--input-radius`)                                                |
| `--radius-2xl`  | 16px | images (through `--img-radius`)                                                       |

Corners that do not read the scale are tied in through the `:root` block of `_design-tokens.scss`:

- `--radius: var(--radius-lg);` for the homepage hero's buttons and code specimen. @fpkit/acss sets `--radius` to
  0.5rem and the site never sets it.
- `--btn-radius: var(--radius-lg);` for every plain `<button>`, which otherwise falls back to 0.375rem.

`pre` (0.5rem) and `article img` (0.3rem) are hard-coded in `src/styles/_base.scss` and change only on request.
`--button-radius` is declared but has no reader.

### Path B: a brand layer

1. Create `src/styles/<brand>-palette.css`, plain CSS outside the Sass build, with every property prefixed by the
   brand name and scoped to `[data-<brand>]` in three blocks:

   ```css
   [data-acme] {
     --acme-ground: #f5f8f6;
     --acme-ink: #12302b;
   }

   @media (prefers-color-scheme: dark) {
     :root:not([data-theme='light']) [data-acme] {
       --acme-ground: #0e1d1a;
       --acme-ink: #e4efeb;
     }
   }

   :root[data-theme='dark'] [data-acme] {
     --acme-ground: #0e1d1a;
     --acme-ink: #e4efeb;
   }
   ```

   The `:not([data-theme='light'])` guard lets the theme toggle beat a dark OS; the last block lets it beat a light
   one.

2. Each opted-in component sets `data-<brand>` on its root element and imports `#styles/<brand>-palette.css`.
3. Each component alias is wrapped so the kit token and the literal fallback survive:
   `--hero-ink: var(--acme-ink, var(--ink, #101418));`. A component with no aliases has its `color`, `background` and
   `border-color` pointed at the brand properties directly.
4. No brand colour may equal `--island` in either theme. The accent audit audits only the homepage, so a brand layer
   on another route is compared to `--island` by hand.
5. Every brand pair is measured with the script in both themes and recorded in a comment at the top of the sheet.
6. `DESIGN.md` gains `colors.<brand>-*` tokens and a `### <Brand> Brand Layer` section under `## Colors`. The checks
   then run without the Sass build.

## Rules the Skill Keeps

| Rule                                                                                         | Checked by                                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `--island` paints only links, buttons and focus rings, never a heading, border or surface    | `e2e/homepage-design-direction.spec.ts`, homepage only                                   |
| Every text pair is at least 4.5:1, in both themes                                            | `e2e/home-accessibility.spec.ts` (five pairs, homepage); the contrast script (all eight) |
| Headings, body and labels use three different font families                                  | `e2e/homepage-design-direction.spec.ts`                                                  |
| Dark is darker than light, and body, header and cards repaint between themes                 | `e2e/homepage-design-direction.spec.ts`                                                  |
| The primary button label is `--paper`, never white, because the accent lightens in dark mode | Nothing                                                                                  |
| Colours change in the mixins, not in `:root`, so all three theme scopes get them             | Nothing                                                                                  |

A green test run is therefore not proof on its own.

## Contrast Script

`.claude/skills/customize-design/scripts/contrast.mjs` reads the `direction-light` and `direction-dark` mixins from
`src/styles/_design-tokens.scss` and measures the eight text pairs the stylesheets paint, in both themes. It needs
no build or browser.

```bash
# The token pairs
node .claude/skills/customize-design/scripts/contrast.mjs

# Any foreground:background pairs (opaque hex or rgb())
node .claude/skills/customize-design/scripts/contrast.mjs '#185c53:#fcfcfd' '#185c53:#f1f3f5'
```

Sample output, measured on the original Astro Kit palette. After a rebrand, your figures will differ:

```text
ink on paper             light 18.04     dark 15.82      body copy
ink-soft on paper        light 5.85      dark 7.37       decks, eyebrows, captions
island on paper          light 7.01      dark 8.54       links, focus ring, Paper label on the primary button
ink on paper-sunk        light 16.62     dark 14.51      header band, cards, code blocks
ink-soft on paper-sunk   light 5.39      dark 6.76       captions on cards and in the header band
island on paper-sunk     light 6.46      dark 7.83       links in the header band and on cards
island on island-bg      light 6.29      dark 6.71       ghost button hover, active dashboard link
ink on island-bg         light 16.20     dark 12.43      ::selection
```

| Exit code | Meaning                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------- |
| `0`       | Every pair is at least 4.5:1                                                                      |
| `1`       | A pair is under 4.5:1                                                                             |
| `2`       | It could not measure: a malformed pair, an unreadable colour, or a missing or Sass-computed token |

Behaviour worth knowing:

- Every pair is held to 4.5:1. WCAG allows 3:1 for large text (24px and up) and non-text marks, but the script does
  not apply that allowance, so judge those cases separately.

- Ratios are floored to two decimals, so 4.499 never prints as a passing 4.50. Older figures in `DESIGN.md` were
  rounded and can read 0.01 higher (6.77 there, 6.76 here).
- Comments are stripped before the mixins are read, so a commented-out declaration cannot override a real one.
- A Sass expression such as `#{$var}` reports "cannot measure" rather than "missing".
- The token file is found relative to the script, so it works from any working directory.
- It exports `PAIRS`, `readTheme`, `ratio` and `report` for the unit tests.
- Island on paper-sunk, island on island-bg and ink on island-bg are measured by nothing else.

## Verification

Every command runs from the repository root, with tools called from `./node_modules/.bin/` so nothing is downloaded:

```bash
npm run sass:build && ./node_modules/.bin/prettier --write src/styles/index.css
node .claude/skills/customize-design/scripts/contrast.mjs
./node_modules/.bin/vitest run tests/integration/design-tokens.test.ts tests/scripts/design-contrast.test.ts
./node_modules/.bin/playwright test e2e/home-accessibility.spec.ts e2e/homepage-design-direction.spec.ts
```

- Do not swap in `npm test`: its `pretest` rebuilds `index.css` compressed and leaves a whole-file diff.
- Playwright needs its browsers installed once (`./node_modules/.bin/playwright install`). When they are missing, the
  skill reports that the end-to-end checks did not run.
- If port 4321 is taken, Playwright reuses whatever is listening, which may be another checkout with the old
  colours. Check with `lsof -nP -iTCP:4321 -sTCP:LISTEN` and, if taken, prefix the command with
  `PLAYWRIGHT_BASE_URL=http://localhost:4341`.

When it finishes, the skill reports the files changed, the contrast table before and after, which checks ran and
which did not, and what is left (logo, favicon, site title). It commits nothing unless asked.

## Maintaining the Skill

- `tests/scripts/design-contrast.test.ts` covers the script. It checks the real token file for shape and passing
  contrast only, never for specific values, because rebranding is the point of the skill. Values are checked against
  fixtures.
- The `verify` skill (`.claude/skills/verify/SKILL.md`) describes how to check a skill and its helper scripts at
  runtime.
- When `SKILL.md` changes, update this guide and the Starlight page at
  `src/content/docs/guide/customize-design.mdx`.

## Related Files

| File                                                   | Purpose                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `.claude/skills/customize-design/SKILL.md`             | The skill's instructions                                          |
| `.claude/skills/customize-design/scripts/contrast.mjs` | The contrast script                                               |
| `tests/scripts/design-contrast.test.ts`                | Unit tests for the script, including its exit codes               |
| `src/styles/_design-tokens.scss`                       | The direction tokens in both themes, the font face and the radius |
| `src/styles/starlight-custom.scss`                     | The accent for the `/guide/` docs                                 |
| `DESIGN.md`                                            | The written design spec                                           |
| `project-docs/03-features/design-direction.md`         | The design direction this skill rebrands                          |
| `src/content/docs/guide/customize-design.mdx`          | The same guide in Starlight                                       |
