---
status: todo
type: feature
created: 2026-08-05
effort: high
glance: The site ships a full design-token layer that nothing actually reads, so the homepage paints @fpkit/acss defaults in a single typeface and dark mode cannot change a pixel. Wiring those tokens to real surfaces and rebuilding the hero around a live component specimen turns a page that describes components into one that shows them. Done means three type roles render, both dead token aliases have consumers, flipping to dark repaints every surface, and no route scrolls horizontally at 320px.
---

# Plan: Show the components instead of describing them

## Objective

Connect the existing design-token layer to the surfaces that paint, give the kit three distinct type roles instead of one, and rebuild the homepage hero and feature grid so a developer sees components rendered next to the code that produces them.

## Context

A design review measured the running site in-browser at 1280px and 390px. The findings were not subjective: exactly **one** typeface (`-apple-system`) renders across every h1, h2, h3, p, a and button; the homepage paints 7 colours, none of them the project's own `--color-primary-500` (`#0ea5e9`); `--card-background` and `--header-background` have **zero** consumers; the loaded CSS contains **one** dark-mode rule and it only redefines `:root` variables, so **zero** painted surfaces respond; the hero h1/deck ratio is **1.63** (78.4px over 48px); and the six feature cards have byte-identical computed styles.

The design system is real but disconnected. `src/styles/_design-tokens.scss` defines a full alias layer at lines 203-232 and none of it resolves to a consumer, while `src/styles/_base.scss:4` hardcodes `background-color: #fff`. The two blues on screen (`#1d4ed8`, `#2563eb`) are @fpkit/acss link defaults, not design decisions.

The headline problem is editorial rather than technical: this is a component library whose homepage shows no components. Six boxes of prose describe components a developer never sees rendered.

The direction is one idea specific to Astro rather than to websites in general — **colour marks hydration**. Astro ships static HTML and withholds JavaScript, so static content is ink and the accent appears only where something is interactive. That is a structural rule and machine-checkable, not decoration. The palette is `--ink: #101418`, `--ink-soft: #5a6472`, `--paper: #fcfcfd`, `--paper-sunk: #f1f3f5`, `--island: #5b2cf5`, `--island-bg: #f0ebff`, `--rule: #dde1e6` — deliberately not sky-500 (Tailwind stock) and not indigo-600. All pairs clear WCAG AA: ink on paper ~18:1, ink-soft ~6.4:1, island ~6.7:1, and the dark variants 6.1:1 or better.

Three decisions are already settled: self-host one subset woff2 rather than a CDN or system-stack-only; apply the token layer sitewide (unavoidable, since body background and text colour are global) but confine the hero rebuild and card tiering to the homepage; and keep the `Card` and `FeatureCards` prop signatures stable, since both are package exports via `src/components/index.ts` — new props are optional with defaults and new slots are additive.

Risk: step 4 repaints every route, including templates this review never measured, which step 8 exists to catch. Mitigation is the baseline captured in step 1 plus a route-by-route sweep at four widths in both themes.

A clickable prototype of the target state, with a Current/Proposed toggle and a working theme switch, is at `docs/prototypes/restyle-astro-kit-homepage.html`.

## Files

- `public/fonts/space-grotesk-600.woff2` (new) — latin-subset display face, single weight
- `src/styles/_design-tokens.scss` (modified) — direction tokens, `@font-face`, display role, dark-mode surface flips
- `src/styles/_base.scss` (modified) — consume `--paper`/`--ink`, assign the three type roles, settle the deck override
- `src/layouts/Base.astro` (modified) — preload the display face
- `src/components/astro/HomeHero.astro` (new) — homepage hero with the live component specimen
- `src/layouts/Layout.astro` (modified) — guarded forward of the `header` slot through to `Base`, which it does not currently pass on
- `src/pages/index.astro` (modified) — render `HomeHero` into the forwarded `header` slot
- `src/components/astro/FeatureCards.astro` (modified) — render `sectionTitle`, add promoted tiering, drop the dead style block
- `src/components/astro/Card.astro` (modified) — additive `code` slot for the promoted tier
- `e2e/homepage-design-direction.spec.ts` (new) — objective-verification smoke test
- `tests/components/FeatureCards.astro.test.ts` (new) — unit coverage for the previously-dead prop
- `tests/integration/design-tokens.test.ts` (new) — guard against tokens losing their consumers again
- `project-docs/03-features/design-direction.md` (new) — the styling contract for package consumers

## Steps

1. Capture a baseline before touching anything by running `npm test`, `npm run type-check` and `npm run test:e2e`, recording the pass/fail count per runner to `docs/plans/baseline-add-homepage-design-direction.txt` Why: this repo's suite already fails on a clean checkout, so a non-zero exit code after the work proves nothing and only the delta between the baseline and the post-change run carries information Verify: the file exists and lists a pass/fail count for each of the three runners rather than just an exit code.
2. Self-host the display face by adding a latin-subset, single-weight `space-grotesk-600.woff2` to `public/fonts/`, declaring `@font-face` with `font-display: swap` and a `--font-family-display` token in `src/styles/_design-tokens.scss`, and preloading it from `src/layouts/Base.astro` Why: exactly one family renders across every heading, paragraph, link and button today, so headings and body differ only by size and the page reads as undesigned rather than deliberate Verify: `getComputedStyle(document.querySelector('h1')).fontFamily` resolves to Space Grotesk and the network panel shows exactly one font request.
3. Assign three type roles sitewide in `src/styles/_base.scss` — headings to `--font-family-display` with negative tracking, body copy to the system sans, and eyebrows, labels, captions and code to `--font-family-mono` — and settle the override that makes `header > section > p` compute to 48px when line 64 declares `2rem` Why: three roles is the smallest set that reads as deliberate, the mono role carries the technical character of a component kit at zero byte cost, and the deck currently competes with the headline at a 1.63 size ratio Verify: a distinct-font-family count across heading, body and label elements on the homepage returns 3, and the global header deck computes to its declared size.
4. Define the seven direction tokens in `src/styles/_design-tokens.scss`, replace the hardcoded `background-color: #fff` at `src/styles/_base.scss:4` with `var(--paper)`, set `color: var(--ink)`, and point the already-declared `--card-background` and `--header-background` aliases at the new surface tokens Why: the alias layer at lines 203-232 resolves to zero consumers, so every painted surface inherits @fpkit/acss defaults and the blues on screen are the vendor's link colour rather than a design decision Verify: a stylesheet scan reports at least one `var()` consumer for both aliases and `getComputedStyle(document.body).backgroundColor` traces to a token rather than a literal.
5. Extend the `@media (prefers-color-scheme: dark)` block at `src/styles/_design-tokens.scss:236` to flip the new surface tokens and add a `:root[data-theme="dark"]` override path so an explicit toggle can win over the media query Why: exactly one dark-scoped rule exists in the loaded CSS and it only redefines `:root` custom properties, so no painted surface responds and dark mode currently cannot change a single pixel Verify: `getComputedStyle(document.body).backgroundColor` differs between light and dark emulation and at least one dark-scoped rule sets a background or colour on an element rather than a variable.
6. Create `src/components/astro/HomeHero.astro` with a mono eyebrow, a left-aligned display headline, a deck at roughly a third of the headline size, two calls to action and a specimen figure pairing a rendered `Card` with the import line that produces it, forward the named slot through `src/layouts/Layout.astro` as `{Astro.slots.has('header') && <slot name="header" slot="header" />}`, then render `HomeHero` from `src/pages/index.astro` into that slot Why: `index.astro` renders `Layout.astro`, not `Base.astro`, and `Layout.astro` today forwards only `featured`, the default slot and the two sidebar slots, so a bare `slot="header"` on the page is silently dropped before it ever reaches the `Astro.slots.has('header')` branch at `src/layouts/Base.astro:102` — and the forward must stay guarded, because an unconditional `<slot name="header" slot="header" />` makes `slots.has('header')` true on every route and would suppress the default `Header` sitewide Verify: the homepage renders `HomeHero` at a display-to-deck font-size ratio of 3.0 or above with `text-align: left`, and `/about`, `/posts/1` and `/docs` each still render the original `Header` with its page title.
7. In `src/components/astro/FeatureCards.astro` render the `sectionTitle` prop that line 27 destructures and the template never uses, add an optional `promoted` count defaulting to current behaviour that splits output into promoted specimens and compact rows, delete the `<style>` block at lines 51-61 whose `border-radius: 0` never applies, and add an additive `<slot name="code" />` to `src/components/astro/Card.astro` Why: six byte-identical cards give the eye nowhere to land, and both defects are live in components the package exports from `src/components/index.ts`, so every fix must stay additive to avoid breaking consumers Verify: `npm run type-check` passes with no call-site changes, passing `sectionTitle` renders a heading, and the computed card border-radius matches the stylesheet instead of contradicting it.
8. Load `/`, `/posts/1`, `/content/1`, `/docs`, `/tags` and `/about` at 320, 390, 768 and 1280 in both light and dark, checking horizontal overflow and contrast on each Why: step 4 repaints global surfaces, so the interior routes this review never measured are where breakage will surface, and the repo fixed a 320px reflow regression in 254278a that must not return Verify: `document.documentElement.scrollWidth - document.documentElement.clientWidth` is 0 for every route, width and theme combination.
9. Document the direction with a features page under `project-docs/` and a matching Starlight docs entry covering the token names, the colour-marks-interactivity rule, the three type roles and how a consumer overrides them Why: the project's own instructions require any feature be documented in both project docs and the Starlight guide, and these tokens form the public styling contract for a package other projects import Verify: both pages exist and `npm run build` completes with the new entry in the Starlight sidebar and no broken-link warning.

## Tests

Tier 1 — This plan changes application code
- Objective: the homepage actually adopts the direction rather than merely declaring it. File: `e2e/homepage-design-direction.spec.ts`; Type: smoke; Asserts: three distinct font families resolve where one did, the display-to-deck ratio is at or above 3.0 where it was 1.63, both token aliases have at least one consumer where they had none, body background differs between light and dark where it was identical, no non-interactive element carries the accent colour, and horizontal overflow is 0 at 320, 390, 768 and 1280; Run: `npm run test:e2e -- homepage-design-direction`
- Unit: FeatureCards renders its previously-dead prop and tiers its output without breaking its public signature. File: `tests/components/FeatureCards.astro.test.ts`; Targets: `src/components/astro/FeatureCards.astro`; Key cases: `sectionTitle` renders a heading when supplied and nothing when omitted, `promoted` splits the two tiers, and the pre-existing prop set alone still yields the current card count
- Integration: the dead-token defect this plan fixes cannot silently return. File: `tests/integration/design-tokens.test.ts`; Targets: `src/styles/_design-tokens.scss` compiled through to `src/styles/index.css`; Key cases: every component alias token declared in `:root` has at least one `var()` consumer in the compiled CSS, and the dark-mode block sets at least one painted property rather than variables alone
- E2E: the new surfaces stay reflow-safe and accessible on real routes. File: `e2e/home-responsive.spec.ts` and `e2e/home-accessibility.spec.ts`, both extended; Targets: the homepage and one interior route through the running app; Key cases: no horizontal overflow at 320px in light and dark, the documented contrast pairs clear WCAG AA, and keyboard focus stays visible against the new surfaces

## Acceptance Criteria

- [ ] Three distinct `font-family` values resolve across headings, body and labels on the homepage
- [ ] The homepage display-to-deck font-size ratio is at or above 3.0
- [ ] `--card-background` and `--header-background` each have at least one consumer in the compiled stylesheet
- [ ] `getComputedStyle(document.body).backgroundColor` differs between light and dark
- [ ] At least one dark-scoped rule sets a background or colour on an element, not only on `:root`
- [ ] `FeatureCards` renders `sectionTitle` when passed, and every existing call site compiles with no prop changes
- [ ] The `<style>` block at `FeatureCards.astro:51-61` is gone and no remaining rule declares a value that loses to the vendor stylesheet
- [ ] Horizontal overflow is 0 at 320, 390, 768 and 1280 for `/`, `/posts/1`, `/content/1`, `/docs`, `/tags` and `/about`, in both themes
- [ ] No non-interactive element computes to the accent colour
- [ ] Routes other than `/` still render the shared `Header` component
- [ ] The direction is documented in `project-docs/` and in the Starlight guide

## Verification

Re-run the measurement pass from the original review against the dev server and compare each number to the Context section: font-family count 1 to 3, hero ratio 1.63 to at or above 3.0, token alias consumers 0 to non-zero, dark-mode surface rules 0 to non-zero, and accent-carrying non-interactive elements 0 throughout.

Then re-run `npm test`, `npm run type-check` and `npm run test:e2e` and compare against the step 1 baseline file. The gate is that no test which passed at baseline now fails; a red suite on its own does not indicate a regression in this repo.

Finally walk `/`, `/posts/1`, `/content/1`, `/docs`, `/tags` and `/about` in both themes at 320 and 1280, confirming each renders, none scrolls horizontally, and the interior routes are visually unchanged apart from the new palette and type.

## Next Steps

- Roll the direction out to the interior routes
  The hero and card tiering are homepage-only by design; the remaining index templates still use the shared header.
  ```text
  The astro-basics homepage now uses a design direction defined in src/styles/_design-tokens.scss: ink/paper/island tokens, three type roles (display, body, mono), and a rule that the accent colour marks interactivity only. The hero and card tiering are currently homepage-only, applied via src/components/astro/HomeHero.astro slotted into the Base layout's header slot. Extend the same treatment to the post, content, docs and tags index templates without changing the shared Header component's behaviour for routes that do not opt in. Measure horizontal overflow at 320px and the display-to-deck ratio on each route before and after, and report both.
  ```
- Fix the footer copy defect
  Unrelated to this plan but found during the same review.
  ```text
  In src/components/astro/Footer.astro line 11, the text "Learn more about my projects on" is followed by a newline and then a Social component. Astro trims that whitespace, so the page renders "projects ontwitter github youtube". The {' '} separators sit between the social links but not before the first one. Fix the spacing and add a test that fails if the run-on returns.
  ```
- Wish list: per-recommendation toggles in the prototype
  Would let each of the five changes be judged in isolation rather than all at once.
  ```text
  docs/prototypes/restyle-astro-kit-homepage.html has a Current/Proposed switch that flips all five design recommendations at once, so no single change can be judged in isolation. Add five independent toggles (typography, colour, hero, cards, dark mode) so each can be turned on and off separately against the current baseline. Keep the file self-contained with no CDN, and keep the existing seed/proto-model script blocks and the table's data-field contract intact.
  ```

## Unresolved Questions

- **Webfont weight coverage.** The plan self-hosts a single weight of Space Grotesk (600) for display headings. Whether one weight covers h2 and h3 as well as h1, or whether a second (say 500) is needed, depends on which heading levels the templates actually use — worth inspecting `src/pages` and `src/components/astro` and pricing both options before step 2 ships.
- **Starlight theme alignment.** The docs section is styled by `src/styles/starlight-custom.scss`. Whether it should inherit the ink/paper/island palette and type roles or deliberately stay on the Starlight defaults is unresolved; matching would mean overriding a set of Starlight's own CSS custom properties.

## Resources

- `docs/prototypes/restyle-astro-kit-homepage.html` — clickable prototype of the target state, with a Current/Proposed toggle and a working light/dark switch. Flipping to Current and then to Dark demonstrates the inert-dark-mode defect this plan fixes.
- Commit 254278a — the 320px reflow fix whose regression step 8 guards against.
- `src/styles/DESIGN-TOKENS-README.md` — the existing token documentation this direction extends.
