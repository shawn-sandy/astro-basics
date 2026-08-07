---
status: proposal
type: feature
created: 2026-08-06
repo-name: astro-basics
---

# Proposal: Config-driven named themes with a repo-aware theme-authoring Skill

> **Deprecated.** The authoritative artifact is the saved prompt at
> `docs/prompts/proposal-add-config-driven-theming.md`. This copy is written for
> one deprecation release (plan-agent 6.0.0) and is removed in 6.1.0. Edit the
> prompt, not this file.

> This is a proposal for review, not an execution plan. It captures the token
> layer, the selector path, and the enforcement contract as they exist in the
> repo today, and proposes config-driven named themes plus a theme-authoring
> Skill. The load-bearing decisions are resolved (see Locked decisions);
> execution is handed off (see Next step).

## TL;DR

astro-basics already owns a working theme override mechanism — seven "direction"
tokens wrapped in `@mixin direction-light` / `direction-dark`, plus
`:root[data-theme="light"|"dark"]` blocks that beat the OS media query on
specificity. What it lacks is a selector: `src/layouts/Base.astro:37` renders
`<html lang="en">` with no attribute, so on the main site that machinery is
driven by nothing. The work is therefore not "build a theming system" but "add
the selector, generalize the hardcoded light/dark pair into N named themes, and
give theme authoring a repo-aware Skill." Recommended path: a new
`data-site-theme` attribute stamped from a `SITE_THEME` constant in
`src/utils/site-config.ts`, three shipped themes (`default`, `ember`, `forest`)
each with a light and dark form, and a `.claude/skills/theme-builder` skill that
writes the SCSS, registers the theme, rebuilds CSS, and reports measured
contrast.

## Context

The idea: let the site owner pick the site's visual theme through
configuration, ship three themes as worked examples, and make authoring a fourth
a guided operation rather than an archaeology exercise in a 394-line SCSS file.

What already exists, grounded in the files:

- `src/styles/_design-tokens.scss` (394 lines) carries the whole visual identity
  in seven tokens — `--ink`, `--ink-soft`, `--island`, `--island-bg`, `--paper`,
  `--paper-sunk`, `--rule` — plus `color-scheme`. They live in
  `@mixin direction-light` (lines 27-38) and `@mixin direction-dark` (40-50).
- A second, older family — `--color-primary-*` and `--color-neutral-*`, 20
  values — is inverted in lockstep by `@mixin legacy-palette-light` /
  `legacy-palette-dark` (58-104). The lockstep is deliberate: the file's own
  comment records that flipping only the direction tokens leaves consumers
  painting dark values on a light surface.
- `@mixin direction-dark-surfaces` (111-127) repaints `body`, `body > header`,
  `body [data-card]` and `::selection` directly, because @fpkit/acss v6
  hardcodes `whitesmoke` on the header band and resolves `--color-surface` from
  `--color-neutral-0`, a token this repo never declares. Redefining `:root`
  variables alone changes no pixel.
- The override path already exists: `:root[data-theme="dark"]` (379) and
  `:root[data-theme="light"]` (390). Specificity (0,2,0) beats the media query's
  (0,1,0), so a chosen theme always wins over the OS preference regardless of
  source order.
- `src/utils/site-config.ts` is a flat 32-line constants module (`SITE_TITLE`,
  `SITE_DESCRIPTION`, `SITE_LOGO`, `PAGINATION_COUNT`, `CONTACT_INFO`,
  `BREADCRUMB_ROUTE`), re-exported through `src/utils/index.ts` and imported as
  `#utils/site-config` from 14 call sites.
- `.claude/skills/` exists with exactly one precedent skill, `fpkit-developer`,
  shaped as SKILL.md + config.json + references/ + scripts/.
- `src/styles/index.css` is a committed build artifact produced by
  `npm run sass`. It is never hand-edited.

## Core finding

> The repo already has a complete theme override mechanism and no theme
> selector — `:root[data-theme]` is live machinery that nothing on the main site
> drives, because `Base.astro` renders `<html lang="en">` bare and only Starlight
> stamps the attribute on docs routes.

## Side-by-side

| Dimension         | What the objective needs                                                         | What exists today                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Token layer       | Same 7 direction tokens, one mixin per named theme                               | 7 tokens in exactly 2 mixins, `direction-light` / `direction-dark`                                                    |
| Override selector | One block per named theme                                                        | `:root[data-theme="light"\|"dark"]` — a hardcoded pair, correct but not general                                       |
| Selector source   | `SITE_THEME` in `src/utils/site-config.ts`, read once by `Base.astro`            | Nothing on the main site; Starlight stamps `data-theme` on docs routes independently                                  |
| Legacy ramp       | Must move with the theme or 106 call sites stay on the shared sky-blue/zinc ramp | `--color-primary-*` / `--color-neutral-*`, inverted in lockstep for light/dark only                                   |
| Vendor workaround | Needed once per dark-ish theme                                                   | `direction-dark-surfaces` — written once, hardcoded to the dark direction                                             |
| Authoring         | Guided, contrast-checked, repo-aware                                             | Hand-edit a 394-line SCSS file; `acss-kit:theme-create` exists in the environment but knows nothing of these 7 tokens |
| Enforcement       | Every new theme must satisfy the accent contract                                 | `e2e/homepage-design-direction.spec.ts:273` already asserts no non-interactive element computes to `--island`         |

## Locked and resolved decisions

Settled before this draft:

1. **Theme selection is configuration, not runtime state.** The active theme
   comes from a site config setting, not a database table and not per-visitor
   localStorage. Consequence: no migration on the `#libs/database` abstraction,
   no API endpoint, no dashboard UI, no hydration cost. "Admin-driven" means the
   site owner drives it at deploy time.

Resolved in the 2026-08-06 review:

2. **Named themes multiply the light/dark axis rather than replacing it.** A new
   `data-site-theme="<name>"` attribute goes on `<html>`; `data-theme` keeps its
   current meaning of light/dark. Each theme ships a light and a dark mixin pair.
   Rationale: `data-theme` is already claimed twice over — by
   `src/styles/starlight-custom.scss:57` and by Starlight itself on docs routes —
   so overloading it with theme names would collide with a vendor that stamps it
   independently. It also preserves `prefers-color-scheme` and keeps
   `e2e/homepage-design-direction.spec.ts:260` passing unchanged. Cost, accepted:
   three themes means six palettes to author with measured contrast. Propagates
   to Workstreams A, B, E and every Roadmap phase.

3. **The three shipped themes are `default`, `ember`, `forest`.** `default` is
   the current indigo/violet palette extracted verbatim, so day one carries zero
   visual change and proves the extraction was lossless; `ember` (warm
   amber/rust) and `forest` (cool green) demonstrate the range a theme can
   travel. Propagates to Workstream B and Appendix A.

4. **The theme-building Skill writes SCSS and registers the theme end-to-end.**
   It authors `src/styles/themes/_<name>.scss`, wires it into `index.scss`, adds
   the name to the TypeScript union, runs `npm run sass`, and reports measured
   contrast for every token pair; the human reviews a diff. Rejected: emitting
   loose tokens for manual wiring, and wrapping `acss-kit:theme-create`.
   Propagates to Workstream D and Appendix C.

5. **An unknown theme name is a compile-time error, not a runtime fallback.**
   `SITE_THEME` is typed as a union of the registered theme names, so a typo
   fails `npm run type-check` rather than silently painting an unstyled page.

## Workstreams

### A — Generalize the token layer

Restructure `src/styles/_design-tokens.scss` so a theme is a data shape rather
than a hardcoded pair. Extract `direction-light` / `direction-dark` into
`src/styles/themes/_default.scss` as `default-light` / `default-dark`, and
parameterize `direction-dark-surfaces` so it takes the surface tokens as
arguments instead of assuming the one dark direction. The seam is deliberate:
`_design-tokens.scss` keeps every non-colour token because none of those vary by
theme; only the colour direction and the legacy ramp move out. Emit the selector
blocks as `:root[data-site-theme="<name>"]` for the light form and
`:root[data-site-theme="<name>"][data-theme="dark"]` plus the
`prefers-color-scheme` media query for the dark form.

### B — Author the three themes

Six palettes: `default-light` and `default-dark` lifted verbatim from the
current mixins, then `ember` and `forest` in both forms. Each palette declares
the 7 direction tokens plus the 20-value legacy ramp, and each must clear the
contrast floor the current file records: light 18.04:1 (ink/paper), 5.85:1
(ink-soft/paper), 6.56:1 (island/paper), 5.39:1 (ink-soft/paper-sunk); dark
6.15:1 or better on every pair. Contrast is measured, not estimated.

### C — Wire configuration to markup

Add `SITE_THEME` to `src/utils/site-config.ts` as a typed union constant, and
read it in `src/layouts/Base.astro` to stamp `data-site-theme` on `<html>`. One
constant, one attribute, no client JavaScript. `Auth.astro` and any other
root-rendering layout must be checked for the same treatment so themed and
unthemed shells cannot diverge.

### D — The theme-builder project Skill

A new `.claude/skills/theme-builder/` matching the shape of the existing
`fpkit-developer` skill. It takes a seed colour or an intent description,
generates the 7 direction tokens and the legacy ramp for both light and dark,
measures every contrast pair with a script, writes
`src/styles/themes/_<name>.scss`, registers the name in `index.scss` and the TS
union, and runs `npm run sass`. It must encode the two repo-specific contracts a
generic generator cannot know: the accent is reserved for interactive elements,
and the legacy ramp moves with the theme.

### E — Test the contract

Parameterize the accent audit and the dark-override test in
`e2e/homepage-design-direction.spec.ts` over the registered theme names so every
shipped theme is held to the same contract, and add a unit test asserting the
registered SCSS theme names and the TypeScript union agree — the one drift this
design makes possible.

## Risks and tensions

- **The legacy ramp is the real cost.** `--color-primary-*` /
  `--color-neutral-*` have 106 consumers across `src/`, 60 of them in
  `src/styles/components/_utility.scss` and 16 more in
  `src/styles/utilities.css`. A theme that changes only the 7 direction tokens
  will visibly half-apply. Mitigation: the ramp is part of the theme mixin from
  the start, which is why each theme is 27 values rather than 7.
- **Two accent tokens, not one.** `--island` is the direction accent;
  `--color-primary-500` is the legacy accent, aliased by
  `--input-focus-border`. A theme that recolours only `--island` leaves form
  focus borders sky-blue. `--input-focus-border`, `--footer-background`,
  `--card-border` and `--input-border` currently have zero consumers, so this is
  latent rather than live.
- **`index.css` is a committed artifact.** Every theme change requires
  `npm run sass` and produces a large compiled diff. A hand-edited `index.css`
  is a defect.
- **Six palettes is real design work.** Two of the three themes are net-new
  colour systems that must clear AA on four measured pairs in two directions.
  The Skill measures and reports; it does not have taste.
- **@fpkit/acss can regress this.** The `direction-dark-surfaces` workaround
  exists because the vendor hardcodes surfaces, and it is now multiplied across
  themes rather than written once.

## Open questions (decisions only)

- **Do named themes extend to the Starlight docs routes?**
  `src/styles/starlight-custom.scss` styles the docs shell independently and
  Starlight stamps its own `data-theme`. Not blocking Phases 1 through 4; decide
  before Phase 5 or explicitly scope docs out.

## Roadmap

| Phase | Work                                                                                                        | Size | Depends on |
| ----- | ----------------------------------------------------------------------------------------------------------- | ---- | ---------- |
| 1     | Workstream A — extract `default` verbatim, parameterize the surface mixin, emit `data-site-theme` selectors | M    | —          |
| 2     | Workstream C — `SITE_THEME` constant, typed union, `Base.astro` stamps the attribute                        | S    | 1          |
| 3     | Workstream B — author `ember` and `forest` in light and dark, with measured contrast                        | L    | 1          |
| 4     | Workstream E — parameterize the e2e accent audit, add the name-drift unit test                              | M    | 2, 3       |
| 5     | Workstream D — the `theme-builder` project Skill                                                            | M    | 3, 4       |

Phase 1 alone is shippable and visibly a no-op, which is the point: it proves
the extraction preserved today's rendering before any new colour is introduced.
Phase 5 lands last on purpose — a Skill that automates theme authoring should be
written after three themes have been authored by hand.

## Appendix A — The theme surface, measured

| Group                  | Tokens                                               | Count                   | Painted by                                                          |
| ---------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| Direction — ink        | `--ink`, `--ink-soft`                                | 2                       | `body` colour, `[data-ui="eyebrow"]`, `[data-ui="label"]`, `code`   |
| Direction — surface    | `--paper`, `--paper-sunk`                            | 2                       | `body` background, `body > header`, `body [data-card]`              |
| Direction — accent     | `--island`, `--island-bg`                            | 2                       | `body a[href]` link colour, `:focus-visible` outline, `::selection` |
| Direction — rule       | `--rule`                                             | 1                       | 4 consumers in `src/styles/`                                        |
| UA hint                | `color-scheme`                                       | 1                       | native controls, scrollbars, form widgets                           |
| Legacy ramp            | `--color-primary-50..900`, `--color-neutral-50..900` | 20                      | 106 consumers, 60 of them in `_utility.scss`                        |
| **Total per palette**  |                                                      | **27 + `color-scheme`** |                                                                     |
| **Total for 3 themes** |                                                      | **6 palettes**          | light + dark each                                                   |

Out of scope for a theme: the type scale, font stacks, spacing scale, radius,
border widths, shadows, z-index, transitions and layout tokens.

## Appendix B — Worked example, the shape of a theme file

```scss
// src/styles/themes/_ember.scss
@mixin ember-light {
  --ink: #1a1310;
  --ink-soft: #6b5a50;
  --island: #b8460f;
  --island-bg: #fdefe6;
  --paper: #fffdfb;
  --paper-sunk: #f7f0ea;
  --rule: #e6dbd2;

  color-scheme: light;
  // ... 20 legacy ramp values
}

@mixin ember-dark {
  /* ... */
}
```

Registered in `_design-tokens.scss`:

```scss
:root[data-site-theme='ember'] {
  @include ember-light;
}

:root[data-site-theme='ember'][data-theme='dark'] {
  @include ember-dark;
  @include direction-dark-surfaces(var(--paper), var(--paper-sunk), var(--ink));
}

@media (prefers-color-scheme: dark) {
  :root[data-site-theme='ember']:not([data-theme='light']) {
    @include ember-dark;
  }
}
```

Hex values above are illustrative shape, not authored palettes — Phase 3
measures them.

## Appendix C — The theme-builder Skill I/O contract

**Input:** a seed colour (hex or CSS named colour) or an intent description,
plus a theme name.

**Output, in order:**

1. `src/styles/themes/_<name>.scss` with `<name>-light` and `<name>-dark`
   mixins, 27 values each.
2. Selector blocks appended to `_design-tokens.scss`.
3. `<name>` added to the `SiteTheme` union in `src/utils/site-config.ts`.
4. `npm run sass` executed; `src/styles/index.css` regenerated.
5. A contrast report: every pair from Appendix A measured in both directions
   against the recorded floor, pass or fail per pair.

**Refusals:** refuse to register a theme whose accent fails the accent/paper
floor; refuse to hand-edit `index.css`.

## Next step

Convert to an execution plan:

```
/plan-agent:implementation-plan author an execution plan from the proposal prompt at docs/prompts/proposal-add-config-driven-theming.md
```
