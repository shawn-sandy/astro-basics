# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Homepage Design Direction** (`src/components/astro/HomeHero.astro`, `src/styles/_design-tokens.scss`):
  the homepage now renders live component specimens instead of describing them
  - Seven direction tokens — `--ink`, `--ink-soft`, `--paper`, `--paper-sunk`, `--island`,
    `--island-bg`, `--rule` — each flipping in both `prefers-color-scheme: dark` and the
    `:root[data-theme]` override path, so an explicit toggle always beats the OS preference
  - "Colour marks hydration": `--island` paints only interactive elements. An E2E test fails the
    build if any non-interactive element computes to the accent
  - Three type roles where there was previously one: display (self-hosted Inter 600,
    24KB latin subset, preloaded), body (system sans), mono (code and labels)
  - `HomeHero.astro`: full-bleed band pairing a rendered `Card` with the import line that produces
    it. Content stays on the 80rem measure via `padding-inline: max(gutter, (100% - maxw) / 2)`
  - `FeatureCards.astro` gains `sectionTitle` and `promoted` props for two-tier output — promoted
    specimens carry a code slot, the remainder render as compact rows. Both default to the
    existing six-card layout, so current call sites are unaffected
  - `Card.astro` exports its `Props` type and accepts a named `code` slot
  - Docs: `project-docs/03-features/design-direction.md` and a Starlight guide at
    `/guide/design-direction`
- **Popover Navigation** (`src/components/astro/Navigation.astro`): site navigation moved into a
  native HTML popover panel opened by a hamburger button, at every viewport width
  - Zero JavaScript: open, close, Esc-to-close and outside-click dismissal all come from the
    `popover="auto"` and `popovertarget` attributes
  - `popover="auto"` is written explicitly. The attribute's invalid-value default is `manual`,
    which silently has no light dismiss and no Esc close
  - Exported `Props` type: `brandTitle`, `brandHref`, `menuId`, `showBrand`
  - Site-title brand link on the left; the Clerk auth control stays in the bar
  - `userId`-gated dashboard and profile links render into the panel through the default slot,
    so signed-in users get the same decluttered bar
  - 44x44px hit area (WCAG 2.2 SC 2.5.8), `aria-label="Primary"` landmark, reduced-motion-safe fade
  - `@supports not selector(:popover-open)` fallback renders the links as a static inline row and
    hides the hamburger in engines without the Popover API
  - New `sass:build` script for one-shot SCSS compilation (`npm run sass` is a watcher that never
    terminates, so it cannot be used as a verification command)
  - Coverage: `tests/components/Navigation.astro.test.ts` (8 cases) and
    `e2e/navigation-popover.spec.ts` (10 cases, passing on Chromium)
  - The popover is presentational and never an access-control mechanism; authenticated-only
    markup stays behind the server-side `userId` check
  - Full documentation: [Navigation Popover guide](/guide/components/navigation-popover)
- **Breaking (library consumers)**: `Navigation.astro`'s default slot now renders inside the
  popover panel rather than in the bar
- **Skip to main content link** (`src/layouts/Base.astro`): first focusable element on every page,
  letting keyboard users bypass the nav bar. Matters more now that the hamburger button, not the
  brand link, owns first focus
  - Styling comes from `@fpkit/acss`'s existing `body > a[href^="#"]` rule rather than a
    reimplementation, so it keeps that rule's slide-in transition and `--color-skip-link-bg` token
  - Target is the `<main id="main" tabindex="-1">` landmark in
    `src/components/astro/MainSection.astro`; `tabindex="-1"` is what moves focus rather than only
    the scroll position
  - `src/pages/offline.astro` and `src/pages/supabase-test.astro` bypass `MainSection`, so both
    gained their own `<main>` landmark (neither had one before)
  - Coverage: `e2e/skip-link.spec.ts`
- **User Sync Utility** (`src/utils/user-sync.ts`): Consolidated utility for fetching user data from Clerk and syncing with Supabase
  - `fetchUserWithRole()` function reduces component code by 80% (1 line vs 40+ lines)
  - Automatic user creation when users don't exist in database (handles PGRST116 errors)
  - Race condition safety with upsert operations (prevents duplicate user creation)
  - Graceful error handling with structured error fields (`error` for critical, `roleError` for warnings)
  - Non-throwing design allows components to display appropriate error messages
  - Default role assignment (`'member'`) for new users
  - Re-exported through `#utils/user-sync` and `#utils` for convenient importing
  - Comprehensive JSDoc documentation with usage examples
  - Full documentation: [User Sync Utility Guide](/guide/utilities/user-sync)
- **Component Updates**: Refactored `UserInfo.astro` to use new User Sync Utility
  - Eliminated duplicate user fetching and role sync code
  - Consistent error handling across user-facing components
  - Improved maintainability with centralized sync logic
- **Comment System**: Full-featured comment system for blog posts and documentation pages
  - Polymorphic database design supporting multiple content types (`post`, `doc`)
  - Threaded comments with 3-level nesting support
  - Real-time comment creation, editing, and deletion
  - User authentication via Clerk integration
  - Rate limiting and spam protection (5 comments per minute per user)
  - Content sanitization with DOMPurify for XSS prevention
  - CSRF token validation for secure form submissions
  - Soft delete functionality (comments marked as 'archived')
  - Responsive design with accessibility features (ARIA labels, keyboard navigation)
  - Server-side rendering with client-side interactivity
- Documentation improvements and updates

### Changed

- **Typographic hierarchy pass** (`src/styles/_base.scss`, `src/components/astro/Footer.astro`,
  `src/pages/index.astro`): three adjustments so heading, body and supporting text read at
  distinct levels
  - The display role now covers `h1` through `h6` rather than `h1`-`h3`. Every level resolves to
    weight 600, the single weight the self-hosted woff2 ships, so the wider range costs no
    additional font request. `text-transform: capitalize` deliberately stays on `h1`-`h3`: `h4`-`h6`
    are used for UI labels, and the contact form's `h6` error summary would otherwise render as
    "Please Correct The Following Errors"
  - Footer drops to `0.875rem` on `--ink-soft`, matching the compact feature rows. Social links
    need `--link-fs` retuned rather than a `font-size` override, because the vendor rule
    `a[href] { --link-fs: 1rem; font-size: var(--link-fs) }` declares the variable on the element
    itself, where inheritance cannot reach it
  - The homepage hero and the feature cards were flush; the composing section in `index.astro` now
    carries `margin-block-start: 4rem`. The spacing lives at the call site because `FeatureCards`
    is a package export and must not carry homepage-specific margin
- **Navigation styles scoped to `[data-site-nav]`**: every selector in
  `src/styles/components/_navigation.scss` and in `Navigation.astro`'s `is:inline` first-paint
  block previously matched bare `nav`, `nav:has(> [popover])` and `nav > button[popovertarget]`.
  `Navigation` is exported from `src/components/index.ts` and the package's `./astro` entry, so a
  consumer page with its own popover navigation inherited the site's 44x44 button, transparent
  border and fixed-position panel
  - The root `nav` now carries `data-site-nav` and all 22 selectors are prefixed with it
  - The marker adds `(0,1,0)` uniformly, so every precedence relationship is preserved: the
    inline block moves `(0,1,2)` -> `(0,2,2)` and the stylesheet rules `(0,2,2)` -> `(0,3,2)`
  - **Breaking (library consumers)**: hand-written popover nav markup that relied on these styles
    leaking out of the package must add `data-site-nav` to its root `nav`. Consumers rendering the
    exported `Navigation` component are unaffected — it carries the marker itself

- **Page background**: `body` now sets an explicit `background-color: #fff` in
  `src/styles/_base.scss`. Nothing previously painted the body, so pages fell back to the
  browser's default canvas, which renders dark under `prefers-color-scheme: dark`. The value is
  literal rather than tokenised, so the page stays white in both colour schemes
  - **Superseded by the Homepage Design Direction work above**: the literal is now
    `var(--paper)`, which is the point — the body is meant to follow the colour scheme rather
    than stay white in both. The original entry stands as the record of why the literal was
    there; it is no longer the current behaviour
- Minor updates and refinements

### Fixed

- **Design tokens had no consumers, so dark mode could not change a pixel**:
  `src/styles/_design-tokens.scss` declared a full alias layer that nothing read.
  `--card-background` and `--header-background` each had zero `var()` consumers, so every card and
  the header band fell through to the `@fpkit/acss` defaults — including a hardcoded `whitesmoke`
  on the header. The dark-mode block compounded this by redefining `:root` variables and nothing
  else, so no element repainted. Both aliases now have painted consumers, and the dark scope
  reaches the elements themselves. `tests/integration/design-tokens.test.ts` parses the compiled
  stylesheet and fails if either alias loses its last painting consumer
- **ESLint could not lint the E2E suite** (`eslint.config.js`): Playwright specs fell through to
  the unit-test override, which declares no browser globals, so every `page.evaluate` callback
  using `getComputedStyle`, `Element` or `Node` failed `no-undef` at the pre-commit hook. `e2e/**`
  now has its own override declaring those three globals
- **Popover fallback was silently inert in engines without `:has()`**: the
  `@supports not selector(:popover-open)` block in `src/styles/components/_navigation.scss` listed
  its bare and `:has()` selectors as one comma-separated list. A selector list is unforgiving, so a
  parser that cannot understand `:has()` discards the whole rule — including the bare selector that
  existed specifically to serve those engines. Each block is now written as two separate rules
- **Horizontal overflow at 320px viewports** (WCAG 2.1 SC 1.4.10 Reflow): every page
  scrolled horizontally by 5px on a 320px-wide screen
  - Overrode `@fpkit/acss`'s `body { min-width: 20.3125rem }` (325px) floor with
    `min-width: 0` in `src/styles/_base.scss`. The floor was wider than the viewport
    it had to fit, so the overflow was present with the whole `<nav>` hidden and on
    every page including 404
  - `e2e/navigation-popover.spec.ts`'s 320px reflow test now asserts
    `scrollWidth <= clientWidth` outright, both panel-shut and panel-open. It
    previously had to measure against its own closed-panel baseline because the
    framework floor made an absolute check impossible
  - Added a page-level `no horizontal scrolling at 320px` case to
    `e2e/home-responsive.spec.ts`
- **Flaky axe-core scan in `e2e/navigation-popover.spec.ts`**: `:popover-open` flips at
  the start of the panel's 150ms opacity fade, so the WCAG scan could sample a
  still-transparent panel and report a colour-contrast violation that no user ever
  sees. The scan now waits for the fade to settle before running

## [0.2.0] - 2025-08-15

### Added

- Comprehensive release process documentation and agent coordination system
- Security audit checklist template for all releases (40-60% faster task completion)
- Release epic template with actionable checklists
- Automated release manager agent (`@docs/agents/astro-basics-release-manager.md`)
- Native Clerk-Supabase integration (2025 production-ready architecture)
- Forum and messaging features with Supabase backend
- Organization management capabilities
- Enhanced dashboard with user profile management
- Improved error handling and user feedback

### Changed

- **BREAKING**: Replaced astro-imagetools with native Astro Image component for better security
- **BREAKING**: Removed astro-lighthouse integration (performance monitoring via native tools)
- Updated authentication flow to use Clerk's native third-party integration
- Refactored Supabase client initialization for better flexibility
- Improved camelCase key transformation in data attributes
- Updated Vitest to v3.2.4 for improved testing stability
- Updated @astrojs/vercel adapter to latest version

### Fixed

- Corrected camelCase key transformation in getDataAttributes utility
- Optimized IP address validation to prevent invalid IPv6 truncation
- Fixed various TypeScript strict mode issues
- Resolved Vitest test infrastructure compatibility issues

### Security

- **CRITICAL**: 90% reduction in security vulnerabilities (20 → 2)
- **RESOLVED**: All HIGH and CRITICAL severity vulnerabilities
- **RESOLVED**: Removed vulnerable dependencies (astro-lighthouse, astro-imagetools)
- **RESOLVED**: Updated Vercel adapter to fix path-to-regexp vulnerabilities
- Implemented Row-Level Security (RLS) policies for all Supabase tables
- Added comprehensive security audit requirements for releases
- Enhanced input validation and sanitization
- Improved error handling to prevent information disclosure
- Remaining 2 moderate vulnerabilities are development-only (no production impact)

## [0.1.0] - 2024-12-XX

### Added

- Initial project setup with Astro framework
- Component library structure (Astro and React components)
- Content collections (posts, docs, content) with MDX support
- Clerk authentication integration
- Supabase database integration
- Turso (LibSQL) database support
- PWA functionality with service worker
- E2E testing with Playwright
- Unit testing with Vitest
- SCSS compilation and styling system
- GitHub Actions CI/CD pipeline
- Netlify/Vercel deployment support
- Dashboard with protected routes
- API endpoints for user data
- Message submission system
- Comprehensive linting setup (ESLint, StyleLint, Prettier)
- Pre-commit hooks with Husky
- Database migration system
- SEO optimization with sitemap generation
- Image optimization with Astro Image Tools
- Lighthouse performance monitoring

### Security

- Initial security audit completed
- Authentication middleware implemented
- Protected routes configuration
- Environment variable validation

## Release Schedule

### Upcoming Releases

#### v0.2.0 (Target: Q1 2025)

- Complete security hardening
- Performance optimizations
- Enhanced user profile management
- Improved error handling
- Production-ready release

#### v0.3.0 (Target: Q2 2025)

- Advanced organization features
- Webhook integration
- Real-time collaboration features
- Enhanced analytics

#### v1.0.0 (Target: Q3 2025)

- Stable API
- Full feature set
- Enterprise features
- Complete documentation

## Migration Guides

Migration guides for breaking changes are available in `/docs/migrations/`.

## Contributors

Thanks to all contributors who have helped shape this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For detailed release notes, see the [releases page](https://github.com/shawn-sandy/astro-basics/releases).
