---
status: in-progress
type: feature
created: 2026-08-04
modified: 2026-08-05
issue: https://github.com/shawn-sandy/astro-basics/issues/346
effort: high
glance: The site keeps a full row of nav links in the header at every screen size; moving them behind a hamburger button that opens a native HTML popover panel (like the reference screenshot) cleans up the top bar with zero custom JavaScript. Done means the hamburger opens a top-right panel with all five links, Esc and outside-click close it, no authenticated-only link leaks to anonymous visitors, and the new Playwright and unit specs pass.
---

# Plan: Move the site navigation into a native HTML popover menu

## Objective

Replace the inline navigation link list with a hamburger button that opens a native HTML popover panel (the `popover="auto"` attribute plus a `popovertarget` button) at all screen sizes, matching the reference screenshot's top-right dropdown menu.

## Context

Today `src/components/astro/Navigation.astro` renders a bare `<nav><ul>` of five links (Home, Articles, Blog, About, Contact), and `src/layouts/Base.astro` injects the Clerk sign-in/user button through the `login` slot. The reference screenshot (SayHelloNeighbor.org) shows the target pattern: a clean top bar with a hamburger button on the right that opens a bordered dropdown panel of stacked links.

The native Popover API is the right tool: `popovertarget` gives toggle, light dismiss (outside click), and Esc-to-close for free — no JavaScript. The attribute shipped in Chrome 114, Firefox 125, and Safari 17, but the feature only reached Baseline "newly available" on 2025-01-27 — **light dismiss was broken on iOS and iPadOS until Safari 18.3**, where clicking outside the panel did not close it. That caveat is load-bearing here, because light dismiss is acceptance criterion 3: on iOS Safari 17 through 18.2 the panel opens but only Esc or a second tap on the invoker closes it. Step 7's spec should therefore treat iOS Safari below 18.3 as a known-degraded target rather than a pass. The design-token file already ships `--z-index-popover: 1500` in `src/styles/_design-tokens.scss`, and per-component SCSS partials live in `src/styles/components/` registered through `src/styles/index.scss`.

Why now: astro-basics markets itself as a component library and demonstration site. A navigation built on the native Popover API demonstrates a Baseline web-platform feature with no JavaScript interaction layer to maintain or document as a dependency — the showcase value is the point, alongside the cleaner bar. This ships without an A/B test; if the change draws a discoverability complaint, revert with `git revert` rather than patching forward.

Decisions confirmed with the user: the hamburger + popover applies at **all viewport widths** (not just mobile), and the Clerk `login` slot **stays in the top bar** next to the hamburger, like the Donate button in the reference. The interview added: a site-title brand link on the left, fixed-offset panel positioning, an open-state style, a reduced-motion-safe fade-in, plain list-of-links semantics (no ARIA menu roles, which would demand custom JavaScript), and a 44×44px hamburger button.

**Two corrections from the review panel, both empirically verified in Chrome.** First, `[aria-expanded="true"]` does **not** work as a CSS hook: the expanded state on a popover invoker is an implicit accessibility-tree mapping, not a serialized DOM attribute, so the selector never matches and `getByRole('button', { expanded: true })` returns zero. Use `nav:has(> [popover]:popover-open) button[popovertarget]` instead. Second, the `popover` attribute's invalid-value default is `manual`, and manual popovers have **no light dismiss and no Esc close** — write `popover="auto"` explicitly so a stray `popover={true}` can never silently break the core interaction.

**Accepted tradeoffs and risks.** Desktop visitors lose the always-visible link row — an orientation regression accepted in exchange for the cleaner bar. Browsers without popover support do not hide `[popover]` elements at all, so an unguarded panel would render as a permanently-open fixed overlay next to a dead hamburger button; Step 5's `@supports` guard is what makes the degradation graceful rather than broken. The plan touches auth-conditional markup, so it carries a hard constraint: **the popover is presentational and must never be used as an access-control mechanism** (CWE-602) — every authenticated-only element stays inside the server-side `{userId && ...}` conditional in `Base.astro`.

## Steps

1. Establish a green baseline in the worktree: run `npm install`, then `npx playwright install chromium` (or set `channel: 'chrome'` if the download stalls), and run the existing home suites before touching any code Why: this worktree has no `node_modules`, and the installed `@playwright/test` requests a Chromium build the local cache does not hold — every later verify command fails until both are resolved, and a known-green starting point separates pre-existing failures from ones this change introduces Verify: `npx playwright test e2e/home-structure.spec.ts` passes before any source edit.
2. Add a one-shot `"sass:build": "sass src/styles/index.scss:src/styles/index.css --style=compressed"` script to package.json Why: the existing `npm run sass` script is a `--watch` watcher that never terminates, so it cannot be used as a verification command in an agent or CI context, and nothing else in the repo compiles SCSS — `npm run build` does not, meaning a forgotten recompile ships the feature with no styles while every test still passes Verify: `npm run sass:build` exits 0 and regenerates `src/styles/index.css`.
3. Restructure src/components/astro/Navigation.astro: export a `Props` type (`brandTitle`, `brandHref`, `menuId`, `showBrand`), add a site-title brand link on the left, add a `<button popovertarget={menuId} aria-label="Menu">` carrying a literal inline `<svg aria-hidden="true" focusable="false">` hamburger icon, wrap the link `<ul>` and the default `<slot />` in a `<div id={menuId} popover="auto">` defaulting to `site-nav-popover`, label the landmark `<nav aria-label="Primary">`, and keep `<slot name="login" />` in the bar to the right of the hamburger Why: the native popover invoker wires open, close, Esc, and light dismiss without JavaScript; `popover="auto"` is mandatory because the invalid-value default is `manual` (no light dismiss); the exported `Props` satisfies the repo's non-negotiable component rule and removes the duplicate-ID hazard for an exported library component; the landmark label disambiguates this `<nav>` from the unlabeled ones in `Pagination.astro` and `AstroPages.astro` (WCAG 1.3.1); and the icon must be a literal element, never `set:html` Verify: `npm run type-check` passes and, with `npm run dev` running, the bar shows brand left and hamburger + sign-in right, clicking the hamburger opens a panel with all five links, and Esc and outside-click both close it.
4. Create src/styles/components/_navigation.scss, register it in src/styles/index.scss with `@use "./components/navigation"`, and update the now-stale `body > nav > ul` rule in src/styles/_base.scss: lay the bar out as a flex row with a minimum gap between the hamburger and the login control, size the button `min-width: var(--space-11); min-height: var(--space-11)` (44px), style the open state with `nav:has(> [popover]:popover-open) button[popovertarget]`, reset the UA popover box (`inset: auto; margin: 0`) before applying `top`/`right` offsets that clear the bar without overlapping the login control, style the panel with `--card-background`, `--card-border`, `--card-radius`, `--card-shadow`, `z-index: var(--z-index-popover)`, `min-width: min(16rem, calc(100vw - 2rem))`, `max-height: calc(100dvh - 5rem)`, `overflow-y: auto`, reuse the repo's `outline: 2px solid; outline-offset: 2px` focus convention, and wrap a `var(--transition-duration-150)` `@starting-style` fade in a `prefers-reduced-motion: no-preference` guard Why: the UA centers popovers mid-screen and its `inset: 0; margin: auto` defaults leave the panel stretched unless explicitly reset; `[aria-expanded]` is not a DOM attribute on popover invokers so `:has(:popover-open)` is the only CSS hook that works; the `_base.scss` rule uses a direct-child combinator that stops matching once the `<ul>` moves inside the popover div; the card tokens already flip correctly in dark mode so naming them avoids ad-hoc values; and the clamped width prevents horizontal overflow at 320px (WCAG 1.4.10 Reflow) Verify: `npm run sass:build && npm run lint:styles` exits 0, the open panel renders below the bar with no horizontal scroll at a 320px viewport, and the button's computed box measures at least 44×44px. (Shipped placement is flush-left rather than the top-right described above — see Acceptance Criteria.)
5. Add a `@supports not selector(:popover-open)` block to _navigation.scss that hides the hamburger button and renders the link list inline as a static row Why: browsers without popover support do not hide `[popover]` elements at all, so without this guard the panel renders as a permanently-open fixed overlay beside a focusable button that does nothing when activated — the guard converts a broken-looking header into the intended graceful degradation, using only CSS Verify: disable the Popover API via a browser feature flag (or test in a pre-2023 engine) and confirm the links render as a plain inline row with no floating panel and no visible hamburger button.
6. Add tests/components/Navigation.astro.test.ts using the `experimental_AstroContainer` pattern from tests/compress-html-whitespace.test.ts, asserting the markup contract: the button's `popovertarget` equals the panel's `id`, the panel carries `popover="auto"`, all five hrefs render inside the panel, the brand link renders, and the `<svg>` is `aria-hidden` Why: `Navigation.astro` imports no Clerk code so it renders standalone, and a millisecond-scale unit test catches the `popover="auto"` regression long before a browser is involved — the component's markup contract is the cheapest thing to lock down Verify: `npm test -- Navigation` passes.
7. Add e2e/navigation-popover.spec.ts covering the interactive contract: panel hidden on load, hamburger click opens it with the five links visible, Esc closes it and returns focus to the hamburger, outside click closes it, the hamburger is Tab-reachable and opens with Enter, `boundingBox()` is at least 44×44px, `page.emulateMedia({ reducedMotion: 'reduce' })` yields a computed transition duration of `0s`, an axe-core scan of the open panel reports zero WCAG 2.2 AA violations, and an anonymous visitor sees zero `/dashboard` and `/profile` links Why: the popover behavior is the whole feature, and three acceptance criteria (44px target, reduced-motion, no auth leak) are otherwise manual-only and will silently regress; assert open state via `el.matches(':popover-open')` rather than `getByRole(..., { expanded: true })`, which returns zero for popover invokers Verify: `npx playwright test e2e/navigation-popover.spec.ts` passes.
8. Re-run the existing home suites (e2e/home-structure.spec.ts, e2e/home-responsive.spec.ts, e2e/home-accessibility.spec.ts), then run `npm run build` and confirm `grep -rlE 'href="/(dashboard|profile)"' dist/` returns nothing Why: these suites assert navigation visibility and tab order on the surfaces this change touches most, and the build check proves no authenticated-only markup was baked into the eight-plus `prerender = true` routes where `Astro.locals.userId` is undefined at build time (CWE-524) — the alternation covers both auth-gated hrefs, since `/profile` is the one currently protected by presentation-layer gating alone and would otherwise leak past a `/dashboard`-only check Verify: the three suites pass and the `dist/` grep returns empty.
9. Document the new navigation pattern: update src/components/astro/README.md and src/layouts/README.md, and add a Starlight guide page covering the popover structure, the exported `Props`, and the `@supports` fallback Why: the project's own instructions require features be documented in project docs and the Starlight guide, and `Navigation.astro` is a public library export whose rendered structure and slot placement both change here Verify: `npx markdownlint-cli --config .markdownlint.json src/components/astro/README.md src/layouts/README.md` exits 0 and the docs page builds without a broken-link warning — scoped to the files this step touches, because the repo-wide `npm run lint:md` globs `docs/plans/**` where plan specs necessarily exceed the 120-character MD013 limit (each step is one logical line by design) and already fails on pre-existing plans.

## Files

- package.json (modified) — add the one-shot `sass:build` script
- src/components/astro/Navigation.astro (modified) — brand link, hamburger button, popover wrapper, exported Props
- src/styles/components/_navigation.scss (new) — bar layout, hamburger button, popover panel, `@supports` fallback
- src/styles/index.scss (modified) — register the new navigation partial
- src/styles/_base.scss (modified) — repair the `body > nav > ul` selector broken by the restructure
- src/styles/index.css (generated) — compiled output of the SCSS build
- src/styles/index.css.map (generated) — source map regenerated alongside the CSS
- tests/components/Navigation.astro.test.ts (new) — markup-contract unit test
- e2e/navigation-popover.spec.ts (new) — Playwright spec for the popover contract
- src/components/astro/README.md (modified) — document the new structure
- src/layouts/README.md (modified) — update the Navigation reference

## Tests

Tier 1 — This plan changes application source and styles

- Objective: navigation links live inside a native popover opened by the hamburger button. File: e2e/navigation-popover.spec.ts; Type: E2E; Asserts: menu panel hidden on page load, clicking the hamburger reveals Home/Articles/Blog/About/Contact, Esc closes the panel and restores focus to the invoker; Run: npx playwright test e2e/navigation-popover.spec.ts
- Unit: markup contract renders correctly. File: tests/components/Navigation.astro.test.ts; Targets: Navigation.astro via experimental_AstroContainer; Key cases: `popovertarget` matches the panel id, `popover="auto"` is present, five hrefs render inside the panel, brand link renders, svg is aria-hidden
- E2E: accessibility and degradation contract. File: e2e/navigation-popover.spec.ts; Targets: the popover panel and its invoker button; Key cases: outside click closes the panel, Tab reaches the hamburger and Enter opens it, hit area is at least 44×44px, reduced-motion yields a 0s transition, axe-core reports zero WCAG 2.2 AA violations with the panel open, an anonymous visitor sees no Dashboard or Profile link

## Acceptance Criteria

- [x] The top bar shows a hamburger menu button at every viewport width; the five nav links are no longer rendered inline in the bar
- [x] Clicking the hamburger opens a popover panel listing Home, Articles, Blog, About, and Contact. The panel is anchored flush to the left edge of the viewport, below the bar, with square left corners and rounded right corners (revised during implementation from the original top-right placement)
- [x] Esc and clicking outside the panel both close it, and focus returns to the hamburger button
- [x] The Clerk sign-in/user button remains visible in the top bar and is never covered by the open panel (WCAG 2.2 SC 2.4.11)
- [x] A site-title link sits on the left of the bar and navigates to the home page
- [x] The panel markup carries `popover="auto"` explicitly, not a bare or boolean-rendered `popover`
- [x] The hamburger hit area measures at least 44×44px and shows a distinct style while the panel is open
- [x] The panel fade-in is disabled when the OS prefers reduced motion
- [ ] No horizontal scrolling appears at a 320px viewport with the panel open (WCAG 1.4.10) — **not met, pre-existing.** The panel itself adds nothing (`scrollWidth` is 325 with the panel open and 325 with it closed; the panel's own box measures 256px inside a 320px viewport). The 5px overflow comes from `body { min-width: 20.3125rem }` at `src/styles/_base.scss:5`, which overflows a 320px viewport on every page even with the whole `<nav>` set to `display: none`. Fixing it is a global layout change outside this plan's scope.
- [x] In a browser without Popover API support, the links render as a static inline row and the hamburger button is hidden — verified in two halves; see Verification Results
- [x] No custom JavaScript is added — the behavior uses only the HTML `popover` and `popovertarget` attributes
- [x] An anonymous request to the home page returns zero `/dashboard` and `/profile` links, and `npm run build` bakes none into `dist/`
- [x] `package.json` and `package-lock.json` gain no new dependencies (`sass:build` script only)
- [ ] `npm test`, `npx playwright test`, `npm run type-check`, and `npm run lint:styles` all pass — **partially met.** `npm run lint:styles` and `npm run sass:build` exit 0. `npm test` and `npm run type-check` fail identically before and after this change (see Verification Results); this change adds zero new failures. `npx playwright test` passed on Chromium only, and could not be run as the canonical command; see Verification Results.

## Verification

Start the dev server with `npm run dev` and open http://localhost:4321. Confirm the top bar shows the site-title brand link on the left and the hamburger plus Clerk sign-in control on the right — no inline link row. Click the hamburger: a bordered panel opens flush against the left edge of the viewport, below the bar, listing Home, Articles, Blog, About, and Contact, and the button takes on its open-state styling. (This deviates from the reference screenshot's top-right dropdown; the left-flush placement was chosen during implementation.) Press Esc — the panel closes and focus returns to the hamburger. Reopen and click the page background — it closes again. Tab through the header to confirm no focus is lost or obscured. Repeat at a 320px viewport to confirm no horizontal scrolling, and once while signed in to confirm the Clerk controls still fit.

Then run the full gate: `npm run sass:build && npm run type-check && npm run lint:styles && npm test && npx playwright test`. Every command must exit 0. Finally run `npm run build` and confirm `grep -rlE 'href="/(dashboard|profile)"' dist/` returns nothing, proving neither authenticated-only link reached the prerendered routes.

## Verification Results (2026-08-05)

### Gate commands

| Command | Result |
| --- | --- |
| `npm run sass:build` | exit 0 |
| `npm run lint:styles` | exit 0 |
| `npx markdownlint-cli --config .markdownlint.json` on the three touched docs | exit 0 |
| `npm run build` | exit 0 |
| `grep -rlE 'href="/(dashboard\|profile)"' dist/` | 0 matches |
| `npm test` | exit 1 — **14 failed files / 60 failed tests, identical before and after this change** (measured by stashing the worktree). Passing tests went 428 to 435: the 7 new `Navigation.astro.test.ts` cases. Zero new failures. |
| `npm run type-check` | 127 errors, **identical before and after** (measured the same way). All are pre-existing: `tsc` cannot resolve `.astro` modules, plus unrelated errors in `src/utils/`. No error references `Navigation.astro` or the popover attributes. |
| `npx playwright test` (Chromium) | 17/17 pass — `navigation-popover.spec.ts` 10/10 plus `home-structure`, `home-responsive`, `home-accessibility` 7/7 |
| `npx playwright test e2e/navigation-popover.spec.ts` (Firefox) | 10/10 pass — including Esc focus restoration, which the accessibility review flagged as engine-dependent |
| `npm test -- Navigation` | 8/8 pass (7 markup-contract cases plus a default-slot-renders-inside-the-panel case added when the account links moved) |

### Measured values (Chromium, light scheme)

At 1280x800 with the panel open: brand at x=16; hamburger at x=1147 measuring 45x45; login control at x=1208 (15px gap). Panel at x=1008, y=64, 256x234, right inset 16px. `nav` bottom is y=64 and the panel top is y=64, so the panel clears the bar and does not overlap the login control (SC 2.4.11). Computed panel styles: `position: fixed`, `margin: 0px`, `inset: 64px 16px 502px 1008px` (the UA `inset: 0; margin: auto` is fully reset), `z-index: 1500`, `overflow-y: auto`. Invoker background goes `rgba(0,0,0,0)` closed to `rgb(250,250,250)` open, confirming the `:has(> [popover]:popover-open)` hook fires. At 320px the panel computes `max-width: 288px` and sits entirely inside the viewport.

### Deviations from the spec as written

1. **Reduced motion computes to `1e-05s`, not `0s`.** `@fpkit/acss` ships the canonical reduced-motion reset `transition-duration: .01ms !important`; the non-zero value is deliberate upstream so `transitionend` keeps firing. The spec asserts the longest duration is at or below 1ms, then flips `emulateMedia` back to `no-preference` and asserts at least 0.1s, so the check is discriminating rather than vacuous.
2. **The `@supports` fallback is verified in two halves, not with a live legacy engine.** No engine available to Playwright still lacks the Popover API, and Chromium 147 has dropped `--disable-blink-features=HTMLPopoverAttribute`. Verified instead that (a) the `@supports not selector(:popover-open)` block survives into the compiled CSS with the right declarations and stays inert in a supporting engine, and (b) replaying those exact rules unconditionally hides the hamburger (`display: none`), returns the panel to `position: static` with no border or shadow, and lays the five links out as one row at a single shared y with increasing x and no horizontal scroll.
3. **`npx playwright test` was run through an equivalent config, not the canonical command.** A different project's dev server (`/Users/shawnsandy/devbox/513`) holds IPv6 `[::1]:4321`, and `e2e/test-utils.ts` hardcodes `http://localhost:4321/` while `playwright.config.ts` sets `reuseExistingServer: !CI` — so the canonical command silently runs every spec against that other site. This worktree's server was bound to IPv4 `127.0.0.1:4321` and Chromium pinned with `--host-resolver-rules=MAP localhost 127.0.0.1`. Same specs, same app, no repo file changed.
4. **axe-core is injected from the transitive install.** Acceptance criterion 13 forbids new dependencies while step 7 requires an axe scan. Resolved with `require.resolve('axe-core/axe.min.js')` — axe-core is already present via the declared devDependency `eslint-plugin-jsx-a11y` — so no dependency was added and a missing install throws loudly rather than skipping.

### Not verified

- **Signed-in state.** The plan's Verification asks for one pass while signed in; no Clerk test credentials were available. Anonymous negative-authorization coverage is in place (zero `/dashboard` and `/profile` links in the response and in `dist/`).
- **WebKit.** Chromium and Firefox both pass the full popover spec. WebKit could not be installed: Playwright's browser extraction stalls in this environment (a known local issue — the download completes and the zip validates, but the Node unzip step hangs on macOS `.app` symlinks; Chromium and Firefox were extracted manually with `unzip`). The stalled installer left a stale `~/Library/Caches/ms-playwright/__dirlock` that will block future `playwright install` runs until removed. Cross-engine coverage is already a Next Steps wish-list item.
- **Dark mode.** Deliberately out of scope per Next Steps; the two competing dark-mode systems make it unverifiable today.

### Bug found and fixed during verification

The first draft of the `@supports` fallback was dead code. `@supports` gates whether a block applies but does not raise specificity, so `nav > button[popovertarget]` (0,1,2) lost to the main block's `nav:has(> [popover]) > button[popovertarget]` (0,2,2) — in a browser without popover support the hamburger would have stayed visible and the panel would have stayed `position: fixed`, which is exactly the broken permanently-open overlay the review panel flagged as blocking. Fixed by duplicating each fallback selector with the `:has()` root so specificity matches and source order decides, keeping the bare form for engines that support neither `:has()` nor popover.

## Next Steps

- Reconcile the two competing dark-mode systems before claiming dark-theme support
  The project's `_design-tokens.scss` overrides neutrals under `@media (prefers-color-scheme: dark)` while @fpkit/acss ships its dark surfaces under `[data-theme="dark"]`, which `Base.astro` never sets. Dark-mode verification was deliberately dropped from this plan because it cannot pass honestly until this is fixed.

  ```text
  In the astro-basics repo, reconcile the two dark-mode systems: src/styles/_design-tokens.scss overrides --color-neutral-* under @media (prefers-color-scheme: dark) but never overrides --color-neutral-0, while @fpkit/acss defines its dark surfaces under [data-theme="dark"] and src/layouts/Base.astro never sets that attribute. Pick one mechanism, apply it consistently, and verify by loading the home page with the OS in dark mode and confirming --color-surface-elevated resolves to a dark value. Add a CHANGELOG entry.
  ```

- Add `/profile` to the middleware route matcher
  `src/middleware.ts` protects `/dashboard`, `/forum`, and `/organization` but not `/profile`, which relies solely on presentation-layer `<Show when="signed-in">` gating (OWASP A01:2021).

  ```text
  In the astro-basics repo, add '/profile(.*)' to the createRouteMatcher call in src/middleware.ts so the route is protected server-side rather than only by the presentation-layer <Show when="signed-in"> guard in src/pages/profile/index.astro. Verify with an anonymous `curl -sI http://localhost:4321/profile`, which must return a redirect to sign-in rather than 200. Add a CHANGELOG entry and reference OWASP A01:2021 in the commit message.
  ```

- Add baseline security headers to the Netlify config
  `netlify.toml` has no headers block and the repo has no `public/_headers`; a top-layer popover adjacent to a Clerk modal sign-in is a modestly more attractive UI-redress target than a static link row (OWASP A05:2021).

  ```text
  In the astro-basics repo, add a [[headers]] block to netlify.toml setting X-Frame-Options = "DENY", X-Content-Type-Options = "nosniff", and Referrer-Policy = "strict-origin-when-cross-origin" for "/*". Do not add a Content-Security-Policy in this change — Clerk's mode="modal" sign-in needs frame-src and connect-src allowances that require separate verification. Verify with `curl -sI` against a deploy preview. Add a CHANGELOG entry.
  ```

- Wish list: expand the Playwright CI matrix beyond Chromium
  `playwright.config.ts` gates Firefox and WebKit to non-CI runs, so cross-engine popover and `@starting-style` differences ship untested.

  ```text
  In the astro-basics repo, evaluate running the Firefox and WebKit Playwright projects in CI (playwright.config.ts currently gates them to non-CI runs). Report the added CI wall-clock cost and recommend whether to enable them for all specs or only for e2e/navigation-popover.spec.ts, which depends on cross-engine Popover API and @starting-style behavior.
  ```

## Unresolved Questions

- ~~Where do the Dashboard and Profile links live?~~ **Resolved 2026-08-05 by the plan owner: they move into the popover panel.**

  `src/layouts/Base.astro` now passes the `userId`-gated links through `Navigation.astro`'s default slot, which renders inside the panel, and keeps only the Clerk auth control in the `login` slot. Signed-in users get the same decluttered bar as anonymous ones — brand, hamburger, Clerk control — with all seven links in the panel, separated into a site group and an account group by a `ul + ul` rule in `_navigation.scss`.

  The security posture is unchanged: the `{userId && ...}` server-side conditional is still what keeps the links out of an anonymous response. Moving markup inside `[popover]` hides nothing (CWE-602), and the negative-authorization E2E assertion plus the `dist/` grep both still return zero.

- Is relocating the default `<slot />` a breaking change for library consumers?

  ```text
  In the astro-basics repo, Navigation.astro is exported via src/components/index.ts and package.json's "./astro" export, so external consumers can pass content into its default slot. The plan at docs/plans/move-navigation-into-popover.md moves that slot inside a [popover] div, changing where consumer content renders. Determine whether any consumer relies on this, and recommend whether the change needs a major version bump and CHANGELOG breaking-change entry, or whether the default slot should stay outside the panel. Do not implement; report the recommendation.
  ```

- Should the nav bar become sticky?

  ```text
  In the astro-basics repo, [popover] elements are UA-styled position: fixed and live in the top layer, but body > nav is not sticky (see src/styles/_base.scss). With the popover navigation from docs/plans/move-navigation-into-popover.md, scrolling with the menu open leaves the panel pinned top-right while the hamburger scrolls away — popovers do not close on scroll. Recommend either making body > nav sticky (position: sticky; top: 0 with a background and z-index) or accepting scroll detachment, and explain the visual tradeoff. Do not implement; report the recommendation.
  ```

## Resources

- Reference screenshot (SayHelloNeighbor.org header) — supplied with the request; shows the hamburger button and top-right dropdown panel this plan reproduces
- MDN: Popover API — https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- WCAG 2.2 SC 2.5.8 Target Size (Minimum), Level AA — 24×24 CSS px minimum; the 44×44px button exceeds it. (The original plan cited "WCAG 2.1 AA target size," which does not exist — 2.1's target-size criterion is AAA.)
- WCAG 2.2 SC 2.4.11 Focus Not Obscured (Minimum), Level AA — governs the panel-over-login-control overlap constraint in Step 4
- WCAG 2.1 SC 1.4.10 Reflow, Level AA — governs the 320px width clamp in Step 4

## Panel Review (2026-08-04 UTC)

_Reviewed by: PM · Lead Developer · UX Designer · Lead Frontend Engineer · Accessibility Expert · Security Expert — coordinated by Lead Coordinator_

### 1. Executive Summary

The plan's core approach — native Popover API, no JavaScript, disclosure semantics over ARIA menu roles — was endorsed by all six reviewers without dissent. All six returned "approve with changes"; none were unavailable. Confidence in the direction is high, but the original draft leaned on two mechanisms that are factually wrong, and the Lead Developer empirically disproved both in Chrome: `[aria-expanded="true"]` never matches a popover invoker (the expanded state is an implicit accessibility-tree mapping, not a DOM attribute), and a bare `popover` attribute risks resolving to `manual`, which has no light dismiss and no Esc close. A third finding — `npm run sass` is a `--watch` watcher that never terminates — made one verify step unrunnable. Final decision: **Approve with revisions**, all of which have been applied.

### 2. Role-by-Role Review

#### Product Manager

_Works well:_ tight scope with no creep; the zero-JavaScript constraint is a real maintenance-cost reducer worth naming as business rationale; graceful degradation is sound risk mitigation; reuses existing design tokens and the established SCSS partial pattern.

_Critical concerns:_ (1) no user problem stated or validated — the Context explained the mechanism and the reference screenshot but never why replicating it serves this site; (2) no business goal or success metric anywhere — all acceptance criteria were functional; (3) desktop-wide link-hiding is a content-discoverability regression with no mitigation, and SayHelloNeighbor.org (single-CTA nonprofit) is not an obvious model for a multi-section content site with Articles and Blog as primary destinations.

_Minor:_ browser-support "low risk" was asserted, not measured; the project's own CLAUDE.md requires features be documented in project docs and the Starlight guide, and no documentation step existed.

_Missing:_ user value, business goals, success metrics, release-readiness/rollback plan, prioritization rationale relative to the in-progress Astro v7 work.

_Approval status:_ approve with changes.

#### Lead Developer

_Works well:_ Popover API is the right call and CSS anchor positioning correctly rejected as Chrome-only; the `<nav>` landmark survives so the three existing `getByRole('navigation')` assertions keep passing (each verified individually); `--z-index-popover: 1500` genuinely exists at `_design-tokens.scss:156`; Step 4's scoping to the nav-touching suites is correct; the plan correctly listed the git-tracked generated `index.css`.

_Critical concerns:_ (1) **`[aria-expanded="true"]` will never match** — verified in Chrome via Playwright with the exact proposed markup: `hasAriaExpandedAttr: false`, `matchesAriaSelector: false`, computed background unchanged, and `getByRole('button', { name: 'Menu', expanded: true }).count()` returned 0. The working selector is `nav:has(> [popover]:popover-open) button[popovertarget]`, which did match. (2) **`popover` must be written `popover="auto"`** — the attribute's invalid-value default is `manual`, which disables light dismiss and Esc with no error anywhere. (3) **`npm run sass` is a watcher** (`package.json:34`) — the verify command never terminates, and there is no one-shot SCSS build in the repo; `npm run build` does not compile SCSS, so a forgotten recompile ships unstyled with every test still green. (4) The panel is viewport-fixed but the bar is not sticky — the menu detaches on scroll and popovers do not close on scroll. (5) The dark-mode verify cannot pass honestly: `_design-tokens.scss:236` overrides neutrals under `prefers-color-scheme` but not `--color-neutral-0`, while acss ships dark surfaces under `[data-theme="dark"]` which `Base.astro` never sets.

_Minor:_ hard-coded `id="main-menu"` breaks if the exported component renders twice; acss already ships a `.fpkit-popover` pattern the plan neither reuses nor rejects; acss descendant selectors (`nav ul>li { min-height:100% }`) still bite inside the panel; `z-index` on a top-layer element is decorative; fade-out would need `transition-behavior: allow-discrete`; stylelint enforces alphabetical order, `max-nesting-depth: 4`, and `selector-max-compound-selectors: 4`.

_Missing:_ no `export type Props` (a CLAUDE.md non-negotiable); no unit-test tier despite a working `experimental_AstroContainer` pattern at `tests/compress-html-whitespace.test.ts`; no documentation step; no signed-in-state verification; no library-consumer breaking-change note; no SEO note (Footer.astro has no nav links, so every internal link loses its rendered-visibility signal in one commit).

_Risks:_ the worktree has no `node_modules`; installed `@playwright/test` 1.59.1 requests `chromium_headless_shell-1217` but the cache holds only `-1234`, forcing a `channel: 'chrome'` fallback; local runs use three engines while CI runs Chromium only; a 150ms fade can race `toBeHidden()` assertions.

_Approval status:_ approve with changes.

#### UX Designer

_Works well:_ the brand → hamburger → login ordering reuses built-in browser behavior correctly for a flat 5-item list; the no-ARIA-menu-role decision is deliberate and correctly reasoned; the reduced-motion acceptance criterion is concrete and testable; verification covers 375px, not just desktop.

_Critical concerns:_ (1) **signed-in users don't get the decluttered bar the objective promises** — `Base.astro:74-90` puts Dashboard and Profile links plus the Clerk button in the same `login` slot, so authenticated users still see an inline link row, backwards for a cleanup feature. (2) **The "acceptable degradation" claim is inaccurate** — unsupported browsers don't hide `[popover]` at all, and combined with Step 4's `position: fixed`, the menu renders as a permanently-open fixed overlay with a dead toggle. (3) Viewport-fixed positioning breaks the trigger-to-panel relationship on centered max-width layouts, violating the basic disclosure expectation that a popup emerges from what opened it.

_Minor:_ icon-only affordance with no visible "Menu" text is a bigger discoverability risk than usual here, since the plan removes a nav users are accustomed to; no hamburger → X icon transformation on open; no `aria-current="page"` orientation cue once the whole list is hidden by default.

_Missing:_ onboarding affordance for the desktop behavior change (in or out of scope, but currently silent); error state for the unsupported-browser path; IA decision for the authenticated flow.

_Approval status:_ approve with changes.

#### Lead Frontend Engineer

_Works well:_ native Popover over a JS disclosure is the right state-management call — no hydration directive, no store; reuses the existing z-index token; `Navigation.astro` has exactly one call site (`Base.astro:65`), verified by grep; follows the SCSS partial convention; Tier 1 E2E-only is appropriate for a no-logic feature; the "no custom JavaScript" criterion is a good architectural guardrail.

_Critical concerns:_ (1) **`body > nav > ul` in `_base.scss:12-24` uses a direct-child combinator that silently stops matching** once the `<ul>` moves inside the popover div — margin-block-end returns and the hover-background suppression is lost, a concrete regression the plan's manual verification would not catch. (2) **The UA default `[popover]` box model is not reset** — `inset: 0; margin: auto; width: fit-content` is what produces the mid-screen centering the plan already names; setting only `top`/`right` leaves `bottom: 0; left: 0` and `margin: auto` in the cascade, producing a stretched or mispositioned box.

_Minor:_ panel styling described in prose when `--card-background`, `--card-border`, `--card-radius`, `--card-shadow` already exist and flip correctly in dark mode; `--space-11` is exactly 44px; `--transition-duration-150` exists; CI runs Chromium only so cross-browser claims are unenforced; the hamburger is a dead control in the fallback path with no rule to hide it.

_Missing:_ documentation step; no automated assertion for the 44×44 hit area or the reduced-motion criterion; no focus-restoration assertion; no build-output check that no `client:*` directive slipped in.

_Approval status:_ approve with changes.

#### Accessibility Expert

_Works well:_ disclosure semantics over ARIA menu roles matches the APG Disclosure pattern and avoids the well-known `role="menu"`-without-arrow-keys anti-pattern; native light dismiss and Esc satisfy SC 2.1.1 for free; the 44px target is good practice; the `prefers-reduced-motion` guard is correctly scoped; `aria-label="Menu"` gives the icon-only button a discernible name (SC 4.1.2, 2.5.3).

_Critical concerns:_ (1) **Focus loss on close is unaddressed** (SC 2.4.3) — native popover does not restore focus to the invoker on Esc in all engines; "focus is not trapped" does not verify focus lands anywhere meaningful. (2) **Focus-not-obscured risk** (WCAG 2.2 SC 2.4.11, new at AA) — the panel opens over the same region as the login control, and since the popover is non-modal a keyboard user can Tab to a control the panel visually covers. (3) No verification method for the reduced-motion requirement — an acceptance criterion with no automated test will silently regress. (4) **Reflow** (SC 1.4.10) — a 16rem panel with a fixed right offset is not guaranteed to fit a 320px viewport without horizontal scrolling.

_Minor:_ the plan cited "WCAG 2.1 AA target size," which does not exist — 2.1's target-size criterion is AAA; the correct citation is WCAG 2.2 SC 2.5.8 (24×24 CSS px minimum, which 44px exceeds). The inline SVG needs `aria-hidden="true" focusable="false"`. No contrast values named for panel text (SC 1.4.3, 4.5:1) or button border/icon (SC 1.4.11, 3:1). Focus-visible styling unspecified despite an existing repo convention at `_user-profile.scss:162-164`. No stated gap between hamburger and login control (SC 2.5.8 spacing exception). The fallback leaves a focusable button that does nothing.

_Missing:_ no axe-core scan of the open-panel state; no focus-destination assertion; no screen-reader manual test despite the whole state story resting on browser-managed `aria-expanded`; no landmark label to disambiguate from the unlabeled `<nav>` elements in `Pagination.astro` and `AstroPages.astro`.

_Approval status:_ approve with changes.

#### Security Expert

_Works well:_ zero new dependencies keeps the supply-chain surface flat (OWASP A06:2021); no new XSS sink since no script is added (CWE-79); the auth decision stays server-side via `Astro.locals.userId` from `clerkMiddleware`; `SITE_TITLE` is a compile-time constant, not request-derived; styles land in a compiled partial rather than inline, keeping a future `style-src` CSP viable.

_Critical concerns:_ (1) **The plan does not forbid using `popover` as an access-control mechanism** (CWE-602) — content inside `[popover]` is fully present in the HTML response regardless of open state, and because the restructure relocates auth-gated markup, an implementer could conclude a closed popover "hides" Dashboard and Profile. (2) **Prerendered routes can bake auth-conditional nav markup** (CWE-524/525, OWASP A01:2021) — eight-plus routes set `prerender = true`, where `userId` is undefined at build time; verification on `/` alone passes, and the tempting "fix" bakes authenticated markup into statically-served HTML. (3) **`/profile` has no middleware protection** — `middleware.ts:56` matches `/dashboard`, `/forum`, `/organization` only, and `/profile` relies solely on presentation-layer `<Show when="signed-in">` gating (OWASP A01:2021).

_Minor:_ `playwright.config.ts` sets `--disable-web-security` on the chromium project, so the suite can never validate `frame-ancestors` or CSP; no CSP or framing protection exists anywhere in the repo; `id="main-menu"` is a guessable global id and MDX content collections permit raw HTML; the inline SVG authoring method was unspecified.

_Missing:_ threat model, cache-control/`Vary` guidance, signed-in E2E coverage, dependency-risk enforcement, secrets constraint for any future authenticated spec, and a GDPR Art. 5(1)(f) note given Clerk's `UserButton` renders identity PII.

_Approval status:_ approve with changes.

### 3. Highest-Risk Issues

1. **[Lead Dev] `[aria-expanded="true"]` is a no-op** — empirically verified false in Chrome. The open-state acceptance criterion was untestable and the styling would silently never apply.
2. **[Lead Dev] A bare `popover` attribute can resolve to `manual`**, silently killing light dismiss and Esc — the two behaviors the entire "no JavaScript" rationale depends on.
3. **[UX / Frontend / A11y] The stated graceful degradation was actually a broken header** — unsupported browsers do not hide `[popover]`, so the panel renders as a permanently-open fixed overlay beside a dead button.
4. **[Security] Auth-gated markup relocation with no non-goal statement** — nothing in the plan prevented an implementer from treating popover visibility as access control (CWE-602), and nothing verified that prerendered routes stay clean (CWE-524).
5. **[Lead Dev] `npm run sass` never terminates** — one verify command was unrunnable, and no other repo command compiles SCSS, so a forgotten recompile ships unstyled with all tests green.

### 4. Blocking Issues

- **[Lead Dev] The open-state CSS hook** — must change to `nav:has(> [popover]:popover-open) button[popovertarget]`; blocks because the acceptance criterion cannot pass or be tested as originally written.
- **[Lead Dev] `popover="auto"` must be explicit** — blocks because acceptance criterion 3 (Esc and outside-click close) silently fails if the attribute resolves to `manual`.
- **[Lead Dev] A one-shot SCSS build script must exist** — blocks Step 2's verification and, more seriously, the feature can ship with no styles while CI stays green.
- **[Frontend] `_base.scss:12-24` must be repaired** — blocks because the restructure silently breaks a live selector with no step to catch it.
- **[UX / A11y] The `@supports` fallback guard** — blocks because without it the "acceptable degradation" claimed in Context is a broken, permanently-open overlay in real browsers.

### 5. Important but Non-Blocking Improvements

- **[PM]** Business rationale and a rollback note in Context; documentation step per the project's own CLAUDE.md rule.
- **[Lead Dev]** `export type Props`; a unit test via `experimental_AstroContainer`; a `npm install` + Playwright baseline step.
- **[A11y]** axe-core scan, landmark label, `aria-hidden` on the SVG, focus-visible convention reuse, corrected WCAG citation, 320px width clamp.
- **[Frontend]** Named design tokens instead of prose styling; automated 44px and reduced-motion assertions.
- **[Security]** Negative-authorization E2E assertion; `dist/` grep after build; namespaced popover id.
- **[UX]** Visible "Menu" text label; hamburger → X icon swap; `aria-current="page"` orientation cue.

### 6. UX Recommendations

Pin the left-to-right bar order explicitly (brand, hamburger, login) rather than "beside the button." Define a concrete fallback appearance rather than asserting degradation is acceptable. Anchor the panel so it reads as emerging from the hamburger, not floating in the viewport corner. State the focus-on-open decision (stays on the invoker; no `autofocus`) as deliberate so the spec can assert it. Consider a visible "Menu" label and a close-icon swap to offset the discoverability cost of hiding a previously visible nav. Add `aria-current="page"` so users retain orientation once the list is hidden by default.

### 7. Accessibility Requirements

- Test and document the Esc/close focus destination per engine; assert focus returns to the invoker (SC 2.4.3).
- Guarantee the panel never overlaps the login control's screen position while both are in the focus path (WCAG 2.2 SC 2.4.11).
- Clamp panel width to `min(16rem, calc(100vw - 2rem))` and verify no horizontal scroll at 320px (SC 1.4.10).
- Automate the reduced-motion check with `page.emulateMedia({ reducedMotion: 'reduce' })`.
- Add an axe-core scan with the panel open, against WCAG 2.2 AA.
- `aria-hidden="true" focusable="false"` on the inline SVG.
- `aria-label="Primary"` on the `<nav>` to disambiguate from `Pagination.astro` and `AstroPages.astro` (SC 1.3.1).
- Name contrast-checked tokens: ≥4.5:1 for panel link text (SC 1.4.3), ≥3:1 for button border and icon (SC 1.4.11).
- Reuse the repo's `outline: 2px solid; outline-offset: 2px` focus convention and confirm the panel radius does not clip it (SC 2.4.7).
- Hide the hamburger in the no-popover fallback so no one activates a button that does nothing.
- Correct the target-size citation to WCAG 2.2 SC 2.5.8 (24×24 minimum; 44×44 exceeds it).

### 8. Frontend Implementation Considerations

Repair `body > nav > ul` in `_base.scss`. Reset `inset: auto; margin: 0` before applying `top`/`right`. Use `--card-*` tokens, `--space-11` (44px), and `--transition-duration-150` rather than literals. Flatten selectors to respect stylelint's `max-nesting-depth: 4` and `selector-max-compound-selectors: 4`. Reset the acss descendant rules (`nav ul > li { min-height: 100% }`) that follow the `<ul>` into the panel. Note that CI runs Chromium only, so cross-engine claims need a local three-engine run before merge. If a fade-out is ever added, it needs `transition-behavior: allow-discrete`.

### 9. Security Requirements

- State explicitly that the popover is presentational and must never gate authenticated content (CWE-602).
- Add a negative-authorization E2E assertion: an anonymous visitor sees zero Dashboard and Profile links.
- Add a build-output check: `grep -rl 'href="/dashboard"' dist/` must return empty after `npm run build` (CWE-524, OWASP A01:2021).
- Enforce the no-new-dependency intent with a lockfile diff check (OWASP A06:2021).
- Namespace the popover id to survive a duplicate-id collision from MDX-authored raw HTML.
- Require the hamburger icon be a literal inline `<svg>`, never `set:html` (CWE-79).
- Deferred to Next Steps: `/profile` middleware coverage (OWASP A01:2021) and baseline framing headers in `netlify.toml` (OWASP A05:2021).

### 10. Technical Feasibility Concerns

The worktree has no `node_modules` and the local Playwright browser cache is version-mismatched (`@playwright/test` 1.59.1 wants `chromium_headless_shell-1217`; the cache holds `-1234`) — combined with the user's recorded note about Chromium install hangs, this is the plan's highest delivery risk, now addressed by an explicit baseline step. The nav bar is not sticky, so the fixed panel detaches on scroll. The two dark-mode systems conflict, so the dark-mode verification could not pass honestly and was moved to Next Steps.

### 11. Open Questions Before Development

**[UX / Lead Dev / Security / PM]** Do the `userId`-gated Dashboard and Profile links move into the popover or stay in the bar? — recorded as an Unresolved Question.
**[Lead Dev / Frontend / Security]** Is moving the default `<slot />` inside `[popover]` a breaking change for library consumers needing a version bump? — recorded as an Unresolved Question.
**[Lead Dev]** Should `body > nav` become sticky, or is scroll detachment accepted? — recorded as an Unresolved Question.
**[Lead Dev / Frontend]** Is the new spec Chromium-only, or must it pass on Firefox and WebKit locally? — Next Steps wish-list item.
**[A11y]** Which browser/AT combinations get manually verified for expanded-state announcement and Esc focus restoration? If an engine fails, is a minimal non-behavioral JS shim acceptable despite the no-JavaScript criterion?
**[Security]** Is a CDN or edge cache fronting the Netlify SSR functions, and does it vary on the Clerk session cookie?
**[PM]** Is there any usage data behind hiding desktop nav, or is this purely a showcase/aesthetic decision?

### 12. Recommended Changes to the Plan

1. Replace the `[aria-expanded="true"]` hook with `nav:has(> [popover]:popover-open) button[popovertarget]` and document why.
2. Write `popover="auto"` explicitly and assert it in tests.
3. Add a `sass:build` npm script and change the verify command to use it.
4. Add a baseline step: `npm install` + Playwright browser install + a green pre-change test run.
5. Add a `@supports not selector(:popover-open)` fallback that hides the button and shows links inline.
6. Repair `body > nav > ul` in `_base.scss` and reset the UA popover box model.
7. Add `export type Props` with `brandTitle`, `brandHref`, `menuId`, `showBrand`.
8. Add a unit test using `experimental_AstroContainer`.
9. Extend the E2E spec: focus restoration, 44px bounding box, reduced motion, axe-core, negative authorization.
10. Add a build-output check that no authenticated markup reaches `dist/`.
11. Name design tokens instead of prose styling; clamp panel width for 320px.
12. Add `aria-label="Primary"`, `aria-hidden` on the SVG, and the focus-visible convention.
13. Correct the WCAG citation to 2.2 SC 2.5.8; add 2.4.11 and 1.4.10 references.
14. Add the "popover is not access control" non-goal statement.
15. Add a documentation step for project docs and the Starlight guide.
16. Add business rationale and a rollback note to Context.
17. Move dark-mode reconciliation, `/profile` middleware, security headers, and the CI matrix to Next Steps.
18. Record the three genuine product decisions as Unresolved Questions rather than guessing.

### 13. Conflicts or Tradeoffs Between Reviewer Recommendations

**UX vs. Frontend/Lead Dev on positioning.** UX recommended `position: absolute` anchored to a `position: relative` nav so the panel visually emerges from its trigger; Frontend and Lead Dev assumed `fixed` with an explicit `inset` reset. _Resolution: keep `fixed`._ Top-layer elements are positioned against the viewport and ignore ancestor positioning contexts, so `position: absolute` on a `[popover]` does not produce the anchoring UX wants. The legitimate concern behind the UX recommendation — a panel that snaps to the true viewport edge while the button sits inset on a centered layout — is addressed instead by deriving the `right` offset from the same content-width constraint the bar uses, which the revised Step 4 requires.

**PM vs. everyone on metrics.** The PM asked for success metrics, an A/B test, and a rollout plan. _Resolution: partially adopt._ On a low-traffic demonstration site, an A/B harness costs more than the change it measures. The business rationale and an explicit `git revert` rollback note were added; the A/B test was not.

**Security scope vs. plan scope.** Security recommended amending `middleware.ts` and adding `netlify.toml` headers inside this plan. _Resolution: split._ The two items that belong to this change — the non-goal statement and the negative-authorization test — are now steps. The middleware and header changes are real but independent of the navigation restructure, so they became Next Steps prompts rather than scope creep.

**A11y's JS-shim question vs. the no-JavaScript criterion.** If an engine fails to announce the expanded state, a minimal ARIA shim would conflict with acceptance criterion "no custom JavaScript." _Resolution: unresolved by design._ Left as an open question for the user rather than silently relaxing a criterion they set.

### 14. Final Decision

Final decision: **Approve with revisions**

The approach is sound and endorsed unanimously; the revisions were mechanical corrections rather than a change of direction. Five blocking items (the `aria-expanded` hook, `popover="auto"`, the SCSS build script, the `_base.scss` selector repair, and the `@supports` fallback) have been applied to the plan, along with the non-blocking improvements. Three genuine product decisions — Dashboard/Profile placement, the library-consumer slot contract, and sticky-bar behavior — are recorded as Unresolved Questions for the plan owner rather than guessed at.
