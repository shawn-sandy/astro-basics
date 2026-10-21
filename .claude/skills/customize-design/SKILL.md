---
name: customize-design
description: Rebrand the Astro Kit design system - colours, fonts, corner radius - in both themes, keeping DESIGN.md and measured contrast in step. Use when asked to change the site's colours, fonts, theme or branding.
version: 0.1.0
---

# Customize the Design System

Change how astro-basics looks - its accent and neutral colours, its fonts, its corners -
without breaking dark mode, contrast, or the tests that guard the design. `DESIGN.md` is
the written spec. The stylesheet is what ships, so change the stylesheet first and make
the spec match it.

## Where the design lives

| What                 | File                                                                                                                     | Edit                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Palette, both themes | `src/styles/_design-tokens.scss`                                                                                         | the seven tokens in `@mixin direction-light` and `@mixin direction-dark`                 |
| Fonts                | `src/styles/_design-tokens.scss`, `public/fonts/`, `src/layouts/Base.astro`                                              | `@font-face`, `--font-family-display` / `-sans` / `-mono`, the font preload `<link>`     |
| Corners              | `src/styles/_design-tokens.scss`                                                                                         | the `--radius-*` scale, plus `--radius` and `--btn-radius` (see A4)                      |
| Docs site accent     | `src/styles/starlight-custom.scss`                                                                                       | `--sl-color-accent`, `-high`, `-low` and `--sl-color-text-accent`, light and dark blocks |
| Name, logo, favicon  | `src/utils/site-config.ts`, `public/`                                                                                    | `SITE_TITLE`, `SITE_LOGO`, `favicon.svg`                                                 |
| The written spec     | `DESIGN.md`                                                                                                              | frontmatter tokens and the prose that names them                                         |
| Copies of the spec   | `src/content/docs/guide/design-direction.mdx`, `project-docs/03-features/design-direction.md`, `.impeccable/design.json` | the token table, the colour names and the measured ratios (see A6)                       |

The site loads the compiled `src/styles/index.css` (imported in `Base.astro`), not the
SCSS. A token edit changes nothing until `npm run sass:build` runs. Starlight's sheet is
compiled by Vite, so it needs no build step.

Leave these alone - they are not the palette:

- `--color-primary-*` (sky blue) and `--color-neutral-*` (greys): kept for the
  @fpkit/acss components. A sky blue reaching the screen is a regression, not a brand.
- `design-tokens.css`, `design-tokens.json`, `_component-sample-tokens.scss`: extracted
  from a sample file. The site never loads them.
- The fallbacks in `HomeHero.astro` (`var(--ink, #101418)` and one for each other
  direction token): they only apply when a token is missing.

## Rules to keep

Keep these through any rebrand. Tests cover only part of them, so a green run is not
proof on its own.

- **The accent is only for things a visitor can operate.** `--island` paints links,
  buttons and focus rings. Never a heading, border, hairline or surface.
  `e2e/homepage-design-direction.spec.ts` fails if any other element computes to it, but
  it only checks the homepage. Other routes are yours to check.
- **Every text pair is at least 4.5:1, in both themes.** `e2e/home-accessibility.spec.ts`
  checks five pairs on the homepage: ink and ink-soft on paper and on paper-sunk, and
  island on paper. The script below measures those and three more no test covers: island
  on paper-sunk, island on island-bg, and ink on island-bg.
- **Headings, body and labels use three different font families.** Tested in
  `homepage-design-direction`.
- **Dark is darker than light**, and body, header and cards repaint between themes.
  Tested in `homepage-design-direction`.
- **The primary button label is `--paper`, never white.** The accent lightens in dark
  mode, and white text on it would fail contrast. No test checks this; look at the hero
  button in dark mode.
- **Edit the mixins, not `:root`.** Each mixin is included in `:root`, in
  `@media (prefers-color-scheme: dark)` and in `:root[data-theme]`, so one edit reaches
  all three scopes. A colour set only in `:root` stays stale under the other two. No test
  checks this either.

## Step 0 - Ask once, then check the build

Run every command in this skill from the repository root; the paths are relative to it.
The tools are called from `./node_modules/.bin/`, so nothing is downloaded. If one is
missing, run `npm install` rather than reaching for `npx`.

Ask in one message:

1. **Scope.** The whole site (Path A, the default), or a brand layer on a few sections
   only (Path B).
2. **Colour.** One brand colour is enough; you derive the rest. A logo works too: read
   its fills.
3. **Fonts.** Keep Inter, or name a display face they may self-host (Google Fonts' OFL
   fonts can be). Body and labels stay on system stacks unless they ask.
4. **Corners.** Keep 8px, go sharper, or go rounder.
5. **Name.** What the design system is called in `DESIGN.md`. The site title is
   separate, in `site-config.ts`.

Before editing anything, make sure no style work is in progress:

```bash
git status --short src/styles
```

Any output means someone has uncommitted style changes. The rebuild below writes over
`index.css` and would mix their edits into the comparison, so stop and ask them to commit
or set that work aside first. With no output, check that the committed CSS matches its
SCSS:

```bash
npm run sass:build && ./node_modules/.bin/prettier --write src/styles/index.css && git status --short src/styles/index.css src/styles/index.css.map
```

No output means they match. Any output means the committed CSS had drifted from its source
(common in forks), and a rebuild would ship unrelated changes along with the rebrand. Stop,
show the user `git diff --stat`, and ask whether to commit the rebuilt CSS on its own
first, or to use Path B, which needs no rebuild. For Path B, put the committed CSS back with
`git restore src/styles/index.css src/styles/index.css.map`. Nothing is lost: the first
check showed those files were clean.

Record the starting numbers:

```bash
node .claude/skills/customize-design/scripts/contrast.mjs
```

## Path A - Rebrand the whole site

### A1 - Pick the seven colours

| Token          | Role                                                | Light                                                        | Dark                           |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| `--island`     | the accent                                          | the brand colour, dark enough for 4.5:1 on all three grounds | a lighter tint of the same hue |
| `--island-bg`  | accent wash: hover fills, `::selection`, active nav | a very light tint of the hue                                 | a very dark shade of the hue   |
| `--ink`        | text                                                | near-black, may lean toward the hue                          | near-white                     |
| `--ink-soft`   | secondary text                                      | mid-grey; its pair with `--paper-sunk` is the tightest       | mid-grey, lighter              |
| `--paper`      | page background                                     | near-white                                                   | near-black                     |
| `--paper-sunk` | header band, cards, code blocks                     | one step darker than paper                                   | one step lighter than paper    |
| `--rule`       | hairlines, never text                               | light grey                                                   | dark grey                      |

Try candidates before editing anything. Any `#fg:#bg` pair works:

```bash
node .claude/skills/customize-design/scripts/contrast.mjs '#185c53:#fcfcfd' '#185c53:#f1f3f5'
```

Hover and active states are mixed from `--island` with `color-mix()`, so there are no
hover tokens to set.

A brand colour too light for text (yellow, light orange, any pastel) cannot be the accent.
Use a darker shade of its hue for `--island`, keep the bright one for `--island-bg` or the
logo, and tell the user why.

### A2 - Edit the tokens

Change the values in `@mixin direction-light` and `@mixin direction-dark` in
`src/styles/_design-tokens.scss`. Keep the property names: dozens of components read
`--island`, `--ink` and the rest. Replace the ratios in the comment above the mixins with
the script's output. Those figures are a record, never an estimate.

Optionally, point Starlight's accent at the new hue so the docs at `/guide/` match:
`--sl-color-accent`, `-high`, `-low` and `--sl-color-text-accent` in both blocks of
`starlight-custom.scss`. Measure `--sl-color-text-accent` against `--sl-color-bg` and
`--sl-color-bg-sidebar` in each block with the script's hex mode; no test covers the docs.

### A3 - Fonts (only if asked)

1. Put the font in `public/fonts/` as one woff2, one weight, latin subset. Confirm its
   licence allows self-hosting.
2. In `_design-tokens.scss`, update the `@font-face` `font-family`, `font-weight` and
   `src`, and put the new family first in `--font-family-display`.
3. In `src/layouts/Base.astro`, change the preload `href` to match the `src` exactly. A
   mismatch downloads the font twice.
4. Headings render at `--font-weight-semibold` (600; set in `src/styles/_base.scss`). A
   file in another weight needs that line changed too, or the browser fakes the weight.

Each extra weight is another network request: make that choice with the user, not for
them. `--font-family-sans` and `--font-family-mono` must stay different from the display
family and from each other.

### A4 - Corners (only if asked)

Change the scale and the aliases follow:

| Token           | Size | Painted on                                                                            |
| --------------- | ---- | ------------------------------------------------------------------------------------- |
| `--radius-lg`   | 8px  | cards and the navigation toggle and panel (through `--card-radius`), dashboard panels |
| `--radius-md`   | 6px  | links in the navigation panel, dashboard quick-action buttons                         |
| `--radius-base` | 4px  | form inputs (through `--input-radius`)                                                |
| `--radius-2xl`  | 16px | images (through `--img-radius`)                                                       |

Some corners do not read the scale. Tie them in by adding these to the `:root` block of
`_design-tokens.scss`. Radius does not change between themes, so `:root` is enough.

- **The homepage hero's buttons and code specimen** read `--radius`, which @fpkit/acss
  sets to 0.5rem and the site never sets. Add `--radius: var(--radius-lg);`.
- **Every plain `<button>`** reads `--btn-radius`, with a 0.375rem fallback in
  @fpkit/acss. Add `--btn-radius: var(--radius-lg);`.
- **`pre` (0.5rem) and `article img` (0.3rem)** are hard-coded in `src/styles/_base.scss`.
  Point them at a token only if the user wants those corners to change too.

`--button-radius` is declared but nothing reads it, so changing it does nothing.

### A5 - Build and check

```bash
npm run sass:build && ./node_modules/.bin/prettier --write src/styles/index.css
node .claude/skills/customize-design/scripts/contrast.mjs
./node_modules/.bin/vitest run tests/integration/design-tokens.test.ts tests/scripts/design-contrast.test.ts
./node_modules/.bin/playwright test e2e/home-accessibility.spec.ts e2e/homepage-design-direction.spec.ts
```

Don't swap in `npm test`: its `pretest` script rebuilds `index.css` compressed, which
turns the whole file into a one-line diff.

Playwright starts the dev server itself. It needs browsers installed once
(`./node_modules/.bin/playwright install`); if they are missing, say the e2e checks did
not run rather than calling the work verified. If port 4321 is already in use, Playwright reuses
whatever is there, which may be another checkout with the old colours. Check with
`lsof -nP -iTCP:4321 -sTCP:LISTEN`, and if it is taken, prefix the command with
`PLAYWRIGHT_BASE_URL=http://localhost:4341` (any free port).

Then look at the site with `npm run dev`: the homepage, a blog post, `/guide/` and, if
login is on, `/dashboard`. Check each in light and dark, using both the header's theme
toggle and the OS setting, and at 320px wide. Leave the status colours (success,
warning, error, info) alone. They signal state, not brand.

### A6 - Make DESIGN.md and its copies match

- **Frontmatter:** `name`, `description`, the seven `colors` (light values), each
  `typography.*.fontFamily`, `rounded`, and any component value that hardcodes a colour
  (`button-primary-hover.backgroundColor`).
- **`## Colors`:** new names for the colours (Harbour Teal and Harbour Wash are the
  current ones), how the accent is described ("low-chroma blue-green"), light and dark
  hex, and the script's ratios.
- **`## Typography`** if the display font changed, **`## Shapes`** if the corners did.
- **Every other hex, ratio and colour word.** Ratios also appear outside `## Colors`, for
  example under `### Buttons`. List them all and decide each one:

  ```bash
  grep -nE '#[0-9a-fA-F]{6}\b|[0-9]+\.[0-9]+:1|Harbour|petrol|blue-green|teal' DESIGN.md
  grep -nw Inter DESIGN.md
  ```

Then make the same changes in the two published copies:
`src/content/docs/guide/design-direction.mdx` (the `/guide/design-direction` page) and
`project-docs/03-features/design-direction.md`. Both have a token table and the measured
ratios. Run the same `grep` on each. `.impeccable/design.json` is generated from
`DESIGN.md` by the impeccable plugin: regenerate it if the user has that plugin, and
otherwise tell them it is now stale.

Keep the Named Rules. They describe the system, not the brand. Change one only if the
user's brand really breaks it, and tell them which.

The script floors ratios, so 6.768 prints as 6.76. Older figures in `DESIGN.md` were
rounded and can read 0.01 higher. Write the script's figures.

### A7 - Re-sync the published design system (optional)

The README links the Astro Kit design system artifact, which was built from `DESIGN.md`.
If the user wants it updated and has the `design-system-from-design-md` skill, run that
skill now and pass it the artifact's URL, so it re-syncs the existing system instead of
creating a new one. That skill lives in the user's own `~/.claude/skills`, not in this
repo. If it is not available, say so and stop. Don't build an artifact by hand.

## Path B - A brand layer on some sections

Use this when only some sections should carry the brand, such as the homepage hero, while
every other route keeps the kit's palette. It is also the way through when Step 0 found
drifted CSS, because it needs no Sass build.

1. **Create `src/styles/<brand>-palette.css`**, plain CSS outside the Sass build. Prefix
   every property with the brand name and scope it to `[data-<brand>]`, in three blocks:

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

   The `:not([data-theme='light'])` guard lets the theme toggle beat a dark OS. The last
   block lets it beat a light one.

2. **Opt components in.** Each one sets `data-<brand>` on its root element and imports
   the sheet with `import '#styles/<brand>-palette.css'`. The browser loads it once,
   however many components import it.
3. **Point the component's colours at the brand.** The attribute and the sheet only
   declare the new properties; nothing paints with them until a component reads them.
   Components read the direction tokens through their own aliases. `HomeHero.astro`, for
   example, sets `--hero-ink: var(--ink, #101418)` and paints with `--hero-ink`. Repoint
   each alias in an opted-in component by wrapping it, so the kit token and the alias's
   own literal fallback both survive: `--hero-ink: var(--acme-ink, var(--ink, #101418));`.
   The component then still renders without the attribute, and before the tokens load. A
   component with no aliases needs its painted properties (`color`, `background`,
   `border-color`) pointed at the brand properties directly. Then confirm in the browser
   that the section's computed colours are the brand values, in both themes.
4. **No brand colour may equal `--island`**, in either theme. The accent audit in
   `e2e/homepage-design-direction.spec.ts` compares computed colours to the resolved
   `--island`, so a brand heading that matches it fails that test. It only audits the
   homepage, so a brand layer on another route goes unchecked: compare its hexes to
   `--island` yourself. Choose a visibly different hue.
5. **Measure every brand pair** with the script's `#fg:#bg` mode in both themes, and
   record the ratios in a comment at the top of the sheet.
6. **Write it into `DESIGN.md`:** the brand's light values as `colors.<brand>-*` in the
   frontmatter, and a `### <Brand> Brand Layer` section under `## Colors` that names the
   components it paints. Then run A5 without the Sass build, and A7 if wanted.

## Report back

Tell the user:

- which files changed
- the contrast table, before and after
- which checks ran and passed, and which did not run (no Playwright browsers, no login)
- what is left for them: logo, favicon, and site title if those were not part of it

Commit nothing unless they ask.
