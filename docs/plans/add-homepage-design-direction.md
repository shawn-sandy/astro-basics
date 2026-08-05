---
status: todo
type: feature
created: 2026-08-05
repo-name: astro-basics
---

# Plan: Add the homepage design direction

## Context

A design review measured the running site in-browser at 1280px and 390px. The
findings were not subjective:

| Measured | Value |
| --- | --- |
| Typefaces rendering sitewide | **1** (`-apple-system`) for every h1, h2, h3, p, a, button |
| Painted colours on the homepage | 7, none of them the project's own `--color-primary-500` (`#0ea5e9`) |
| `--card-background` / `--header-background` consumers | **0** |
| Dark-mode rules in loaded CSS | **1**, redefining `:root` variables only; **0** touch a painted surface |
| Hero h1 / deck ratio | 78.4px / 48px = **1.63** |
| Feature cards | 6, byte-identical computed styles |

The design system is real but disconnected. `src/styles/_design-tokens.scss`
defines a full alias layer at lines 203-232, and none of it resolves to a
consumer. Meanwhile `src/styles/_base.scss:4` hardcodes
`background-color: #fff`. The blues on screen (`#1d4ed8`, `#2563eb`) are
@fpkit/acss link defaults, not a design decision. Dark mode flips tokens that
nothing reads, so it cannot change a single pixel.

The headline problem is editorial rather than technical: this is a component
library whose homepage shows no components. Six boxes of prose describe
components a developer never sees rendered.

A clickable prototype of the target state exists at
`docs/prototypes/restyle-astro-kit-homepage.html`, with a Current/Proposed
toggle and a working theme switch.

### Direction

One idea, specific to Astro rather than to websites in general: **colour marks
hydration**. Astro ships static HTML and withholds JavaScript, so static
content is ink and the accent appears only where something is interactive.
That is a structural rule, machine-checkable, not decoration.

```
--ink:        #101418   /* cool near-black, replaces the harsh pure #000 */
--ink-soft:   #5a6472
--paper:      #fcfcfd   /* cool paper, not cream */
--paper-sunk: #f1f3f5
--island:     #5b2cf5   /* interactivity only */
--island-bg:  #f0ebff
--rule:       #dde1e6
```

Deliberately not sky-500 (Tailwind stock) and not indigo-600. All pairs clear
WCAG AA: ink on paper ~18:1, ink-soft ~6.4:1, island ~6.7:1, and the dark
variants 6.1:1 or better.

### Decisions already taken

- **Typeface:** self-host one subset woff2 (Space Grotesk), not a CDN and not
  system-stack-only.
- **Blast radius:** token layer sitewide (unavoidable, since body background
  and text colour are global); hero rebuild and card tiering confined to the
  homepage.
- **Public API:** `Card` and `FeatureCards` are package exports via
  `src/components/index.ts`. Their prop signatures stay stable. New props are
  optional with defaults, and new slots are additive.

## Objective

Connect the existing design-token layer to the surfaces that paint, give the
kit three distinct type roles instead of one, and rebuild the homepage hero and
feature grid so a developer sees components rendered next to the code that
produces them.

## Steps

1. **Capture the red baseline.** Run `npm test`, `npm run type-check`, and
   `npm run test:e2e`, and record pass/fail counts to
   `docs/plans/baseline-add-homepage-design-direction.txt`. — *Why:* the suite
   is already failing on a clean checkout of this repo, so a non-zero exit code
   after the work proves nothing; only the delta is meaningful. *Verify:* the
   file exists and lists a count per runner, not just an exit code.

2. **Add the display face.** Place a latin-subset, single-weight
   `space-grotesk-600.woff2` in `public/fonts/`, declare `@font-face` with
   `font-display: swap` in `src/styles/_design-tokens.scss`, add
   `--font-family-display`, and preload it in `src/layouts/Base.astro`. —
   *Why:* exactly one family renders today, so headings and body differ only by
   size; a display role is what separates them. *Verify:*
   `getComputedStyle(h1).fontFamily` resolves to Space Grotesk, and the network
   panel shows exactly one font request.

3. **Assign the three type roles sitewide.** Point headings at
   `--font-family-display` with negative tracking, body at the system sans, and
   eyebrows, labels, captions and code at `--font-family-mono`. Remove the deck
   inflation: `src/styles/_base.scss:64` declares `font-size: 2rem` for
   `header > section > p` but it computes to 48px, so something overrides it —
   find the winner and settle it. — *Why:* three roles is the smallest set that
   reads as designed rather than defaulted, and the mono role carries the
   technical character for free. *Verify:* a distinct-font-family count on the
   homepage returns 3, and the global header deck computes to its declared
   size.

4. **Define the palette and consume it on global surfaces.** Add the seven
   direction tokens to `src/styles/_design-tokens.scss`, replace the hardcoded
   `background-color: #fff` at `src/styles/_base.scss:4` with `var(--paper)`,
   set `color: var(--ink)`, and wire the already-defined dead aliases
   `--card-background` and `--header-background` to the surface tokens. —
   *Why:* the alias layer has zero consumers, so the page currently inherits
   vendor defaults; this is mostly connecting declarations that already exist.
   *Verify:* a stylesheet scan reports a consumer count above zero for both
   aliases, and body background resolves from a variable rather than a literal.

5. **Make dark mode paint.** Extend the existing
   `@media (prefers-color-scheme: dark)` block at
   `src/styles/_design-tokens.scss:236` to flip the new surface tokens, and add
   a `:root[data-theme="dark"]` override path so an explicit toggle can win
   over the media query. — *Why:* one dark rule exists today and it only
   redefines `:root` variables, so no painted surface responds. *Verify:*
   `getComputedStyle(document.body).backgroundColor` differs between light and
   dark, and at least one dark-scoped rule sets a background or colour on an
   element.

6. **Build `HomeHero.astro` and slot it into the homepage.** Create
   `src/components/astro/HomeHero.astro` with a mono eyebrow, left-aligned
   display headline, a deck at roughly a third of the headline size, two CTAs,
   and a specimen figure pairing a rendered `Card` with its import line. Render
   it from `src/pages/index.astro` into the `header` slot that
   `src/layouts/Base.astro:102` already supports. — *Why:* the shared
   `Header.astro` serves every route, so a new component in the existing slot
   confines the layout change to the homepage while every other page keeps its
   current structure. *Verify:* the homepage h1/deck ratio is at or above 3.0
   and text-align is left; every other route still renders the original
   `Header`.

7. **Tier the feature cards and clear two dead bits of code.** In
   `src/components/astro/FeatureCards.astro`: render the `sectionTitle` prop
   that line 27 destructures and the template never uses; add an optional
   `promoted` count (default preserving current behaviour) that splits output
   into promoted specimens and compact rows; delete the `<style>` block at
   lines 51-61, whose `border-radius: 0` never applies because the computed
   value is 8px. Add an additive `<slot name="code" />` to
   `src/components/astro/Card.astro` for the promoted tier. — *Why:* six
   identical boxes give the eye nowhere to land, and both defects are live in a
   component the package exports. *Verify:* passing `sectionTitle` renders a
   heading; existing call sites still typecheck with no prop changes; no
   element carries a style rule that loses to the vendor stylesheet.

8. **Sweep for regressions across routes and widths.** Load `/`, `/posts/1`,
   `/content/1`, `/docs`, `/tags`, and `/about` at 320, 390, 768 and 1280 in
   both themes. Confirm zero horizontal overflow and no unreadable
   colour pairs. — *Why:* step 4 changes global surfaces, so routes this review
   never measured are the likely breakage; the repo fixed a 320px reflow bug in
   254278a and must not reintroduce one. *Verify:*
   `documentElement.scrollWidth - clientWidth` is 0 for every route, width, and
   theme.

9. **Document the direction.** Add a features page under `project-docs/` and a
   matching entry in the Starlight docs collection covering the token names,
   the colour-marks-interactivity rule, the three type roles, and how a
   consumer overrides them. — *Why:* the project convention is that any feature
   is documented in both project docs and the Starlight guide. *Verify:* both
   pages exist, and the Starlight build succeeds with the new entry in the
   sidebar.

## Tests

> Tier: 1 (code-touching)

### Objective-Verification Test

- **File:** `e2e/homepage-design-direction.spec.ts`
- **Type:** smoke test against the running application
- **Asserts:** the plan's objective directly, with each assertion tied to a
  measured before-value so it fails if the behaviour regresses:
  - distinct `font-family` values across headings, body and labels is 3 (was 1)
  - homepage display-to-deck font-size ratio is at or above 3.0 (was 1.63)
  - `--card-background` and `--header-background` each resolve to at least one
    consumer in the compiled stylesheet (was 0)
  - `body` background differs between light and dark emulation (was identical)
  - no non-interactive element computes to the accent colour
  - `scrollWidth - clientWidth` is 0 at 320, 390, 768 and 1280
- **Run:** `npm run test:e2e -- homepage-design-direction`

### Unit Tests

- **File:** `tests/components/FeatureCards.astro.test.ts`
- **Targets:** `src/components/astro/FeatureCards.astro`
- **Key cases:** `sectionTitle` renders a heading when supplied and renders
  nothing when omitted; the optional `promoted` count splits output into the
  two tiers; calling the component with only its pre-existing props still
  produces the current card count, guarding the public API against an
  accidental break. Model the harness on the existing
  `tests/components/Navigation.astro.test.ts`.

### Integration Tests

- **File:** `tests/integration/design-tokens.test.ts`
- **Targets:** `src/styles/_design-tokens.scss` compiled through to
  `src/styles/index.css`
- **Key cases:** every component alias token declared in the `:root` block has
  at least one `var()` consumer in the compiled CSS, which is the exact class
  of defect this plan fixes and the one most likely to silently return; the
  dark-mode block sets at least one painted property rather than variables
  alone.

### E2E Tests

- **File:** `e2e/home-responsive.spec.ts` (extend) and
  `e2e/home-accessibility.spec.ts` (extend)
- **Targets:** the homepage and one interior route through the running app
- **Key cases:** no horizontal overflow at 320px in light and dark; the
  documented contrast pairs clear WCAG AA; keyboard focus remains visible
  against the new surfaces.

## Acceptance Criteria

- [ ] Three distinct `font-family` values resolve across headings, body and
      labels on the homepage.
- [ ] The homepage display-to-deck font-size ratio is at or above 3.0.
- [ ] `--card-background` and `--header-background` each have at least one
      consumer in the compiled stylesheet.
- [ ] `getComputedStyle(document.body).backgroundColor` differs between light
      and dark.
- [ ] At least one dark-scoped rule sets a background or colour on an element,
      not only on `:root`.
- [ ] `FeatureCards` renders `sectionTitle` when passed, and every existing
      call site compiles with no prop changes.
- [ ] The `<style>` block at `FeatureCards.astro:51-61` is gone, and no
      remaining rule in the repo declares a value that loses to the vendor
      stylesheet.
- [ ] Horizontal overflow is 0 at 320, 390, 768 and 1280 for `/`, `/posts/1`,
      `/content/1`, `/docs`, `/tags` and `/about`, in both themes.
- [ ] No non-interactive element computes to the accent colour.
- [ ] Routes other than `/` still render the shared `Header` component.
- [ ] The direction is documented in `project-docs/` and in the Starlight guide.

## Verification

Run the same measurement pass used in the original review against the dev
server and compare each row to the Context table: font-family count 1 to 3,
hero ratio 1.63 to at or above 3.0, alias consumers 0 to non-zero, dark-mode
surface rules 0 to non-zero.

Then re-run `npm test`, `npm run type-check` and `npm run test:e2e`, and
compare against the Step 1 baseline file. The gate is that no test which passed
at baseline now fails; a red suite on its own does not indicate a regression in
this repo.

Finally, walk `/`, `/posts/1`, `/content/1`, `/docs`, `/tags` and `/about` in
both themes at 320 and 1280, confirming each renders, none scrolls
horizontally, and interior routes are visually unchanged apart from the new
palette and type.

## Next Steps

- Roll the direction to interior routes:

  ```text
  The astro-basics homepage now uses a design direction defined in
  src/styles/_design-tokens.scss: ink/paper/island tokens, three type roles
  (display, body, mono), and a rule that the accent colour marks interactivity
  only. The hero and card tiering are currently homepage-only, applied via
  src/components/astro/HomeHero.astro slotted into the Base layout's header
  slot. Extend the same treatment to the post, content, docs and tags index
  templates without changing the shared Header component's behaviour for routes
  that do not opt in. Measure horizontal overflow at 320px and the
  display-to-deck ratio on each route before and after, and report both.
  ```

- Fix the footer copy defect:

  ```text
  In src/components/astro/Footer.astro line 11, the text "Learn more about my
  projects on" is followed by a newline and then a Social component. Astro trims
  that whitespace, so the page renders "projects ontwitter github youtube". The
  {' '} separators sit between the social links but not before the first one.
  Fix the spacing and add a test that fails if the run-on returns.
  ```

- Add per-recommendation toggles to the prototype:

  ```text
  docs/prototypes/restyle-astro-kit-homepage.html has a Current/Proposed switch
  that flips all five design recommendations at once, so no single change can be
  judged in isolation. Add five independent toggles (typography, colour, hero,
  cards, dark mode) so each can be turned on and off separately against the
  current baseline. Keep the file self-contained with no CDN, and keep the
  existing seed/proto-model script blocks and the table's data-field contract
  intact.
  ```

## Unresolved Questions

- Webfont weight coverage:

  ```text
  The astro-basics plan at docs/plans/add-homepage-design-direction.md
  self-hosts a single weight of Space Grotesk (600) for display headings.
  Inspect the heading levels actually used across src/pages and
  src/components/astro, determine whether one weight is enough or whether a
  second (say 500) is needed for h2/h3, and recommend one option with the
  byte cost of each. Assume a latin subset and font-display: swap.
  ```

- Starlight theme alignment:

  ```text
  astro-basics has a Starlight docs section styled by
  src/styles/starlight-custom.scss, and the main site is adopting a new token
  palette (ink/paper/island) defined in src/styles/_design-tokens.scss.
  Determine whether the Starlight docs should inherit the same palette and type
  roles or deliberately stay on the Starlight defaults, and recommend one
  approach. Report which Starlight CSS custom properties would need overriding
  if they should match.
  ```
