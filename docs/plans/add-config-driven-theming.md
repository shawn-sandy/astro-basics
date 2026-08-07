---
status: todo
type: feature
created: 2026-08-06
effort: high
issue: https://github.com/shawn-sandy/astro-basics/issues/363
glance: The site already knows how to repaint itself but has nothing telling it which palette to use. This adds that switch as a config constant, ships three themes through it, and leaves behind a Skill so the fourth theme is a guided operation instead of a 394-line archaeology dig.
---

# Plan: Config-driven named themes, three worked examples, and a Skill that builds the fourth

## Objective

Give astro-basics a named-theme system driven by a `SITE_THEME` constant in
`src/utils/site-config.ts`, ship `default`, `ember`, and `forest` as worked
examples in both light and dark, and add a `.claude/skills/theme-builder`
project Skill that authors and registers new themes end to end.

## Context

`src/styles/_design-tokens.scss` already carries the whole visual identity in
seven "direction" tokens — `--ink`, `--ink-soft`, `--island`, `--island-bg`,
`--paper`, `--paper-sunk`, `--rule` — plus `color-scheme`, wrapped in
`@mixin direction-light` (lines 27-38) and `@mixin direction-dark` (40-50). It
also already ships the override path: `:root[data-theme="dark"]` at line 379 and
`:root[data-theme="light"]` at 390, whose (0,2,0) specificity beats the
`prefers-color-scheme` media query's (0,1,0). What is missing is a selector.
`src/layouts/Base.astro:37` renders `<html lang="en">` with no attribute, so on
the main site that override machinery is driven by nothing — only Starlight
stamps `data-theme`, and only on docs routes. This work adds the selector and
generalizes a hardcoded pair into N named themes; it does not invent a theming
architecture, because one is already here.

Two constraints shaped the design. First, `data-theme` is already claimed twice
over — by `src/styles/starlight-custom.scss:57` and by Starlight itself — so
theme identity gets its own attribute, `data-site-theme`, and `data-theme` keeps
meaning light versus dark. Each theme therefore ships a light and a dark form,
six palettes in total, which preserves `prefers-color-scheme` and keeps the
existing override test passing. Second, the accent is enforced by a test:
`e2e/homepage-design-direction.spec.ts:273` asserts that no non-interactive
element computes to `--island`, so "colour marks hydration" is a contract every
new theme must satisfy rather than a preference it may reinterpret.

The cost centre is the legacy ramp. `--color-primary-*` and `--color-neutral-*`
have 106 consumers across `src/`, 60 of them in
`src/styles/components/_utility.scss` and 16 more in `src/styles/utilities.css`.
A theme that changed only the seven direction tokens would visibly half-apply,
so each palette is 27 values rather than 7. Two further hazards are carried into
the steps: `src/styles/index.css` is a committed build artifact that must never
be hand-edited, and — importantly for how the steps verify themselves — the
committed copy is not what `sass:build` emits. Sass produces a single
compressed line; the repo's stylelint and prettier commit hooks then expand it
to 3,681 lines with single quotes. So a `git diff` against the committed file
can never serve as a lossless-extraction check, and the steps compare two
same-pipeline compiled outputs instead. Second,
`@mixin direction-dark-surfaces` (111-127) exists
only because @fpkit/acss v6 hardcodes `whitesmoke` on the header band and reads
an undeclared `--color-neutral-0`, so it must be parameterized rather than
copied once per theme.

The decisions behind this plan were settled in the proposal at
`docs/prompts/proposal-add-config-driven-theming.md` and are treated here as
inputs, not open questions. The plan interview settled four more: all three
themes compile into the single `index.css` every visitor downloads, since a few
extra KB is cheaper than making the stylesheet build depend on TypeScript
config; the bare `[data-theme]` blocks stay permanently as the no-attribute
fallback; the contrast script compiles through the sass API rather than
regex-matching source; and new themes must clear the 5.39:1 floor the site
already achieves rather than the bare 4.5:1 AA minimum.

Two gaps are known and deliberately accepted. The contrast script measures
colour pairs, not the legacy ramp, so the 40 new `--color-primary-*` and
`--color-neutral-*` values introduced by `ember` and `forest` ship without an
automated gate — step 6's verify covers them by eye, at one utility-class call
site. And because the parameterized accent audit switches themes by setting the
attribute at runtime, it never exercises the SSR stamp; the objective test in
`e2e/site-theme.spec.ts` is the only check that the constant actually reaches
the rendered document, which is why it asserts the attribute and the resolved
token value rather than either alone.

## Steps

1. Create `src/styles/themes/_default.scss` and move the bodies of
   `direction-light`, `direction-dark`, `legacy-palette-light` and
   `legacy-palette-dark` into it verbatim as `default-light` and `default-dark`
   (each merging its direction tokens with its legacy ramp), then `@use` the new
   file from `_design-tokens.scss` and swap the four `@include` sites to the two
   new names. Why: the palette is currently welded into the token file, so a
   second theme has nowhere to live; moving it first proves the extraction is
   lossless before any new colour exists. Verify: before editing anything, snapshot
   the compiled baseline with `npx sass src/styles/index.scss:/tmp/theme-base.css --style=compressed`;
   after the move, run `npx sass src/styles/index.scss:/tmp/theme-after.css --style=compressed`
   and confirm `diff /tmp/theme-base.css /tmp/theme-after.css` prints nothing.
   Compare the two compiled outputs, never the committed `src/styles/index.css` —
   that file is stored expanded and single-quoted by the repo's stylelint and
   prettier commit hooks, so it never matches raw `sass:build` output and a
   `git diff` against it reports a wholesale rewrite on the very first run.
2. Change `@mixin direction-dark-surfaces` to take the surface and ink tokens as
   parameters (`$paper`, `$paper-sunk`, `$ink`) and pass the existing `var(--*)`
   references at its one call site. Why: every dark-form theme needs the same
   @fpkit/acss repaint, and a parameterless mixin would have to be duplicated
   three times and drift. Verify: recompile to `/tmp/theme-after.css` with the
   same `npx sass` command as step 1 and confirm the diff against
   `/tmp/theme-base.css` is still empty, since the arguments resolve to the
   values the mixin previously hardcoded.
3. Register `default` under the new attribute by adding
   `:root[data-site-theme="default"]`, `:root[data-site-theme="default"][data-theme="dark"]`
   and a `prefers-color-scheme: dark` block scoped to
   `:root[data-site-theme="default"]:not([data-theme="light"])`, leaving the
   existing bare `[data-theme]` rules in place permanently, not transitionally.
   Why: `data-theme` belongs to the light/dark axis and to Starlight, so theme
   identity needs a separate attribute that composes with it rather than
   replacing it; the bare rules stay as the fallback for any surface that
   renders `<html>` without the new attribute, Starlight docs routes included,
   which would otherwise paint with no palette at all. Verify: recompile to
   `/tmp/theme-after.css`, then confirm
   `grep -o 'data-site-theme="default"' /tmp/theme-after.css | wc -l` returns at
   least 3 and that `grep -o 'data-theme="dark"' /tmp/theme-after.css | wc -l`
   still finds the pre-existing rules. Count occurrences with `grep -o | wc -l`, not
   `grep -c` — compressed CSS is a single line and `-c` counts matching lines,
   so it can never exceed 1.
4. Add `export type SiteTheme = 'default' | 'ember' | 'forest'` and
   `export const SITE_THEME: SiteTheme = 'default'` to
   `src/utils/site-config.ts`, then read it in `src/layouts/Base.astro` and
   stamp `data-site-theme={SITE_THEME}` on the `<html>` element; check
   `src/layouts/Auth.astro` and `src/layouts/Layout.astro` for their own `<html>`
   elements and give them the same treatment; then create the objective test
   `e2e/site-theme.spec.ts`, asserting the server-rendered `<html>` carries
   `data-site-theme` equal to `SITE_THEME` with no client-side mutation and that
   `--island` and `--paper` resolve to that theme's declared values. Why: this
   is the selector the whole system was missing, a shell that renders `<html>`
   without it would silently fall back to the unthemed `:root` block, and this
   spec is the only test covering the SSR stamp — step 8's accent audit switches
   themes at runtime and never exercises it. Verify: `npm run type-check` exits
   0, `curl -s localhost:4321/ | grep -o 'data-site-theme="[a-z]*"'` against the
   dev server returns `data-site-theme="default"`, and
   `npx playwright test e2e/site-theme.spec.ts` passes.
5. Add `scripts/check-theme-contrast.mjs` that compiles a theme SCSS file
   through the `sass` JavaScript API, reads the emitted custom properties from
   the resulting CSS, and measures five pairs in both forms — ink/paper,
   ink-soft/paper, island/paper and ink-soft/paper-sunk against a 5.39:1 floor,
   plus island/paper-sunk against a 3:1 floor for WCAG 2.2 SC 1.4.11 focus
   indicators — printing a per-pair table and exiting non-zero on any failure or
   on a palette that omits `color-scheme`. Why: steps 6, 7 and 10 all need
   measured contrast and the repo has no contrast tooling, so writing it once
   here keeps the Skill from carrying a private copy; compiling rather than
   regex-matching means it measures what actually ships and cannot be fooled by
   a value expressed as a variable or a function call. Also add
   `tests/check-theme-contrast.test.ts` covering the script itself: known ratios
   reproduced, a text pair below 5.39 rejected, an island/paper-sunk pair below
   3.0 rejected, and a palette missing `color-scheme` rejected. Verify:
   `node scripts/check-theme-contrast.mjs src/styles/themes/_default.scss` exits
   0 and reproduces the ratios recorded in `_design-tokens.scss` lines 25-26 —
   18.04, 5.85, 6.56 and 5.39 for the light form — within 0.05, and
   `npx vitest run tests/check-theme-contrast.test.ts` passes.
6. Author `src/styles/themes/_ember.scss` with `ember-light` and `ember-dark`
   mixins, 27 hand-authored values each — the seven direction tokens plus a
   warm-tuned `--color-primary-*` and `--color-neutral-*` ramp — on an amber/rust
   accent over warm paper, and register it in `_design-tokens.scss` with the
   same three selector blocks as step 3. Why: the first non-default theme is
   what proves the mechanism generalizes rather than merely relocating the
   original palette, and the ramp is hand-authored per theme because 60 of the
   106 legacy consumers are utility classes that would visibly stay cool-grey
   under a warm surface if the ramp were shared. Verify:
   `node scripts/check-theme-contrast.mjs src/styles/themes/_ember.scss` exits 0,
   and with `SITE_THEME` temporarily set to `'ember'` the computed `--paper` on
   `/` differs from the default build's value and a utility-class element
   reading `--color-neutral-100` has moved with it.
7. Author `src/styles/themes/_forest.scss` with `forest-light` and `forest-dark`
   mixins on the same 27-value shape, using a cool green accent over cool-grey
   paper, and register it the same way. Why: a third theme moving in the
   opposite chromatic direction from `ember` demonstrates the range the token
   surface actually supports. Verify:
   `node scripts/check-theme-contrast.mjs src/styles/themes/_forest.scss` exits 0,
   and `grep -o 'data-site-theme=' /tmp/theme-after.css | wc -l` returns at least 9.
8. Parameterize the accent audit and the explicit-override test in
   `e2e/homepage-design-direction.spec.ts` to loop over the registered theme
   names, switching with
   `document.documentElement.setAttribute('data-site-theme', name)` after load —
   the same runtime technique the existing dark-override test already uses at
   line 260 — rather than rebuilding per theme. Why: the accent contract and the
   dark-override guarantee are the two properties a new theme is most likely to
   break, and a test that only ever exercises one theme cannot catch it;
   switching at runtime keeps all three themes in one Playwright session instead
   of three full rebuilds. Verify:
   `npx playwright test e2e/homepage-design-direction.spec.ts`
   passes and its reporter shows the accent audit running once per theme per
   colour scheme.
9. Add `tests/theme-registry.test.ts` asserting that the theme names registered
   in the SCSS (parsed from the `data-site-theme="..."` selectors in
   `src/styles/_design-tokens.scss`) exactly match the members of the
   `SiteTheme` union in `src/utils/site-config.ts`. Why: the design splits one
   fact across a stylesheet and a type, and that split is the only new drift
   this plan makes possible. Verify: `npx vitest run tests/theme-registry.test.ts`
   passes, and temporarily adding a bogus member to the union makes it fail.
10. Build `.claude/skills/theme-builder/` as SKILL.md plus a `references/`
    directory, matching the shape of the existing
    `.claude/skills/fpkit-developer/` skill, documenting the 27-value token
    surface, the accent contract and its e2e enforcement, the @fpkit/acss
    surface workaround, and a workflow that writes the theme file, appends the
    three selector blocks, extends the `SiteTheme` union, runs the contrast
    script, and rebuilds `index.css` — never hand-editing it. Why: three themes
    have now been authored by hand, so the Skill can encode what the work
    actually required rather than what was guessed before doing it. Verify:
    invoking the Skill to create a throwaway fourth theme produces a file that
    passes `scripts/check-theme-contrast.mjs` and leaves
    `npx vitest run tests/theme-registry.test.ts` green; revert the throwaway
    afterwards.

## Files

- src/styles/themes/_default.scss (new) — the current palette extracted verbatim as `default-light` / `default-dark`
- src/styles/themes/_ember.scss (new) — warm amber/rust theme, light and dark
- src/styles/themes/_forest.scss (new) — cool green theme, light and dark
- src/styles/_design-tokens.scss (modified) — drops the inline palettes, gains the `data-site-theme` selector blocks and a parameterized `direction-dark-surfaces`
- src/styles/index.scss (modified) — `@use` the new themes directory
- src/styles/index.css (generated) — recompiled by `npm run sass`; never hand-edited
- src/utils/site-config.ts (modified) — adds the `SiteTheme` union and the `SITE_THEME` constant
- src/layouts/Base.astro (modified) — stamps `data-site-theme` on `<html>`
- src/layouts/Auth.astro (modified) — same treatment if it renders its own `<html>`
- scripts/check-theme-contrast.mjs (new) — WCAG contrast measurement for a theme file
- e2e/homepage-design-direction.spec.ts (modified) — accent audit and override test parameterized over registered themes
- e2e/site-theme.spec.ts (new) — objective test: the SSR-stamped attribute and the resolved token values
- tests/theme-registry.test.ts (new) — SCSS-to-TypeScript theme name parity
- tests/check-theme-contrast.test.ts (new) — covers the contrast script's floors and its `color-scheme` check
- .claude/skills/theme-builder/SKILL.md (new) — the theme-authoring Skill
- .claude/skills/theme-builder/references/token-surface.md (new) — the 27-value inventory and the contracts a theme must satisfy

## Tests

Tier 1 — This plan changes application code
- Objective: a configured theme reaches the server-rendered page and its tokens resolve. File: e2e/site-theme.spec.ts; Type: smoke; Asserts: the server-rendered `<html>` carries `data-site-theme` equal to `SITE_THEME` without any client-side mutation, and the computed `--island` and `--paper` on `/` match that theme's declared values rather than the unthemed `:root` fallback — this is the only test covering the SSR stamp, since the accent audit switches themes at runtime; Run: npx playwright test e2e/site-theme.spec.ts
- Unit: theme registry parity. File: tests/theme-registry.test.ts; Targets: the `SiteTheme` union and the `data-site-theme` selectors in `_design-tokens.scss`; Key cases: all three names present in both, a union-only name fails, a SCSS-only name fails
- Unit: contrast measurement. File: tests/check-theme-contrast.test.ts; Targets: scripts/check-theme-contrast.mjs; Key cases: known default-light ratios reproduced within 0.05, a text pair below 5.39 exits non-zero, an island/paper-sunk pair below 3.0 exits non-zero, a palette missing `color-scheme` exits non-zero
- E2E: accent contract holds for every theme. File: e2e/homepage-design-direction.spec.ts; Targets: the parameterized accent audit and explicit-override test; Key cases: no non-interactive element paints `--island` in any theme or colour scheme, `data-theme="dark"` still overrides `prefers-color-scheme: light` under each `data-site-theme`

## Acceptance Criteria

- [ ] `src/utils/site-config.ts` exports `SITE_THEME` typed as `SiteTheme`, and assigning an unregistered name to it fails `npm run type-check`
- [ ] Every page rendered through `Base.astro` carries `data-site-theme` on its `<html>` element, matching `SITE_THEME`
- [ ] Three themes are registered — `default`, `ember`, `forest` — each with a distinct light form and dark form
- [ ] With `SITE_THEME` unchanged at `default`, the computed values of all seven direction tokens on `/` are identical to the pre-change build in both light and dark
- [ ] Changing `SITE_THEME` to `ember` or `forest` changes the computed `--paper` and `--island` on `/` with no edit to any component or page file
- [ ] `node scripts/check-theme-contrast.mjs` exits 0 for all three theme files, covering both forms of each
- [ ] Every palette clears 5.39:1 on all four text pairs and 3:1 on island/paper-sunk, and declares `color-scheme`; removing `color-scheme` from any palette makes the script exit non-zero
- [ ] The bare `:root[data-theme="light"|"dark"]` blocks still exist, so a page rendering `<html>` without `data-site-theme` still paints a complete palette
- [ ] `npx playwright test e2e/homepage-design-direction.spec.ts` passes with the accent audit running once per registered theme per colour scheme
- [ ] A theme name present in the `SiteTheme` union but absent from the SCSS selectors, or the reverse, fails `npm test`
- [ ] `prefers-color-scheme: dark` and an explicit `data-theme="dark"` both still flip the palette under every registered theme
- [ ] `.claude/skills/theme-builder/SKILL.md` exists with valid frontmatter, and using it to author a new theme produces a file that passes the contrast script and leaves the registry test green
- [ ] `src/styles/index.css` is regenerated by `npm run sass:build` and committed through the repo's stylelint and prettier hooks, never hand-edited — evidenced by the compiled-output comparison in steps 1 and 2, not by a `git diff` against the committed file
- [ ] `e2e/site-theme.spec.ts` and `tests/check-theme-contrast.test.ts` both exist and pass, alongside `tests/theme-registry.test.ts`

## Verification

Start from a clean tree and run the full local gate: `npm run type-check`, then
`npm test`. Do not add a `git diff --exit-code src/styles/index.css` check —
`pretest` runs `sass:build`, which overwrites the committed file with
single-line compressed output, so that diff is guaranteed non-empty and proves
nothing. The stylesheet's correctness is established instead by the
compiled-output comparison in steps 1 and 2, which diffs two artifacts produced
by the same pipeline. Measure both commands as a delta against a pre-change run
rather than trusting an exit code on its own.

Then exercise the objective by hand, once per theme. Set `SITE_THEME` to
`default`, start the dev server, and open `/`. Confirm the page looks unchanged
from the pre-change build — this is the lossless-extraction claim, and it is the
one check that catches a botched palette move. In DevTools, read
`getComputedStyle(document.documentElement).getPropertyValue('--island')` and
confirm it returns `#5b2cf5`. Set `SITE_THEME` to `ember`, restart, reload `/`,
and confirm the same read now returns the ember accent, that the page surface is
visibly warm, and that utility-class elements moved with it rather than staying
on the sky-blue ramp — that last point is what proves the legacy ramp travelled
with the theme. Repeat for `forest`.

With `forest` still active, toggle the OS to dark mode and confirm the palette
flips; then set `document.documentElement.setAttribute('data-theme', 'light')`
in the console and confirm it flips back, proving the two attributes compose
rather than collide. Finally run
`npx playwright test e2e/homepage-design-direction.spec.ts e2e/site-theme.spec.ts`
and confirm both pass. Note that `e2e/test-utils.ts` hardcodes
`http://localhost:4321/` and Playwright reuses whatever server already holds
that port, so check with `lsof -i :4321` before trusting a green run.

## Unresolved Questions

- Do named themes extend to the Starlight docs routes? `src/styles/starlight-custom.scss`
  styles the docs shell independently and Starlight stamps its own `data-theme`.
  This plan scopes docs out; making `ember` apply there is a separate
  integration with its own token surface. Confirm the exclusion before step 10,
  since it changes what the Skill must document.

## Next Steps

- Extend named themes to the Starlight docs routes
  The docs shell is styled independently and currently ignores `data-site-theme`.

  ```text
  In the astro-basics repo, extend the named-theme system (see
  docs/plans/add-config-driven-theming.md) to the Starlight docs routes.
  src/styles/starlight-custom.scss styles the docs shell independently and
  Starlight stamps its own data-theme attribute for light/dark. Map the seven
  direction tokens onto Starlight's own CSS custom properties so that
  data-site-theme on the html element themes /docs the same way it themes the
  main site, without breaking Starlight's built-in light/dark toggle. Verify by
  running the dev server, setting SITE_THEME to 'ember', opening a /docs route,
  and confirming in DevTools that the docs surface and accent match the ember
  values while Starlight's own theme toggle still flips light and dark.
  ```

- Wish list: a per-visitor theme switcher layered over the site default
  Deliberately excluded here — the current design is deploy-time configuration
  with no runtime state and no hydration cost.

  ```text
  In the astro-basics repo, add an optional per-visitor theme switcher on top of
  the config-driven named-theme system described in
  docs/plans/add-config-driven-theming.md. SITE_THEME in src/utils/site-config.ts
  stays the site default stamped as data-site-theme on the html element by
  src/layouts/Base.astro; the switcher should let a visitor override it locally
  and persist that choice, without introducing a flash of the default theme on
  first paint. Treat the no-JavaScript case as a first-class path: the site
  default must still render correctly. Verify by loading the page with
  JavaScript disabled and confirming the site default paints, then with it
  enabled, choosing a different theme, reloading, and confirming the choice
  survives with no visible flash of the previous palette.
  ```

## Resources

- docs/prompts/proposal-add-config-driven-theming.md — the proposal this plan executes; carries the locked decisions and the token inventory
- src/content/docs/guide/design-direction.mdx — the existing narrative on the direction tokens, the accent contract, and the `[data-theme]` specificity argument
- src/styles/DESIGN-TOKENS-README.md — the token system's own documentation
