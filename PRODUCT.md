# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a developer evaluating **Astro Kit** as the starting point for their own
project. They arrive cold, want to see what the kit actually contains, judge whether the code is
worth inheriting, and decide within one session whether to clone it.

Their job on the site is assessment, not reading. The blog, articles, and docs are supporting
evidence of the kit's capability; they are not the destination for a first-time visitor.

Returning readers of the blog and articles exist as a secondary audience, but no surface is
optimized for them ahead of the evaluating developer.

## Product Purpose

Astro Kit is a production-ready Astro website that doubles as its own component library and
reference implementation. It exists so a developer can start a content-rich, authenticated Astro
project from something already wired together rather than assembling auth, a database layer,
content collections, and a design system from scratch.

Success is a developer who clones the repo because they could see, from the site itself, that the
pieces are real and working.

## Positioning

Three claims a neighbouring Astro starter could not truthfully copy, confirmed with the owner:

1. **The full app stack is wired, not stubbed.** Clerk authentication, a hierarchical role system,
   middleware-protected routes, a provider-agnostic database abstraction over Turso and Supabase,
   threaded comments, CSRF protection, and rate limiting all work in the running site.
2. **The repository is built to be worked on by coding agents.** `CLAUDE.md` plus its patterns,
   anti-patterns, and validation companions, MCP server integrations, and project skills make
   agent-assisted development a first-class property of the codebase rather than an afterthought.
3. **The design direction is executable.** Seven tokens and one structural rule — colour marks
   interactivity — enforced by end-to-end tests that fail when a non-interactive element takes the
   accent or when contrast drops below AA.

Explicitly **not** claimed as a differentiator: server-rendered components that ship zero client
JavaScript. That is Astro's baseline behaviour, not something this kit adds, and leading with it
positions the product against nothing. This was a deliberate exclusion, not an omission.

## Operating Context

- Visitors are developers, on a desktop browser, comparing this against other Astro starters and
  against the effort of building from scratch.
- Evaluation happens by reading rendered output next to the source that produced it, and by
  following through to the Starlight guide at `/guide/` for component and API reference.
- The public surface spans a homepage, a blog (`/posts/`), articles (`/content/`), tags, about, and
  contact; the authenticated surface spans `/dashboard`, `/forum`, `/organization`, and `/profile`.
- Deployment defaults to Netlify, with Vercel and Node adapters selectable through
  `ASTRO_ADAPTER`.

## Capabilities and Constraints

- **Distribution: clone or use as a template.** People fork or clone the GitHub repository and
  build from it. `package.json` is `private: true`, and its `exports` field for
  `src/components/astro/*.astro` is vestigial. No install command is truthful today. Any call to
  action must point at the repository or the guide.
- Astro in SSR mode (`output: 'server'`) with selective React hydration.
- 36 `.astro` components and 8 React components in the library today. The "30+" figure used in
  existing copy is accurate but conservative.
- Three content collections — `posts`, `docs`, `content` — authored in MDX with a shared schema and
  a `publish: true` gate for public content.
- Documentation is served by Starlight under `/guide/`, titled "Astro-Basics Guide", separate from
  the main site's own layout.
- Internal imports use `#` path aliases; database access goes through `src/libs/database.ts` only.
- Progressive web app: service worker, offline page, install prompt, standalone mode.
- Known constraint: `/docs` currently answers 500 because it requests a collection entry that does
  not exist. `/guide/components/` is the working component index.

## Brand Commitments

- Name: **Astro Kit** (`SITE_TITLE`). The repository and guide are named `astro-basics` /
  "Astro-Basics Guide"; the two names coexist today and no consolidation has been decided.
- Owner and author: Shawn Sandy. Repository: `github.com/shawn-sandy/astro-basics`. Licence: MIT.
- Tagline in use: "A simple, easy to use multipurpose starter theme for Astro."
- The `--island` accent is a deep petrol, chosen specifically so the page does not read as a
  framework default. It is not to drift toward the sky-blue or violet/indigo families.
- The existing token vocabulary — `ink`, `ink-soft`, `paper`, `paper-sunk`, `island`, `island-bg`,
  `rule` — is the public styling contract for consumers and its names are stable.

## Evidence on Hand

Real and usable:

- A working component library, renderable next to the source that produces it — the homepage hero
  already does exactly this with a live `Card` and the code that generated it.
- A published Starlight guide covering components, API reference, MCP servers, roles, database
  switching, and the design direction.
- Measured accessibility and design-direction results in `e2e/` — `home-accessibility.spec.ts`,
  `homepage-design-direction.spec.ts`, `home-performance.spec.ts`, `home-responsive.spec.ts`.
- Written contrast measurements taken against the running page, recorded in the design-direction
  guide.

Absent — future work must not invent these:

- No testimonials, customers, adopters, download counts, stars, or press.
- No pricing, licensing tiers, or commercial offering.
- No case studies or third-party endorsements.
- `src/pages/about.astro` is unmodified Astro-tutorial boilerplate — a fictional "Sarah, technical
  writer in Canada". It is placeholder content, not product truth, and nothing may cite it.
- Feature card imagery currently points at `picsum.photos` placeholders.

## Product Principles

1. **Show the thing, do not describe it.** A developer evaluating the kit trusts rendered output
   beside its source more than any claim about quality. Demonstration outranks assertion.
2. **Claim only what is wired.** The differentiators are real working systems; copy that outruns
   the implementation costs more credibility than it buys with this audience.
3. **Do not sell Astro's baseline as the kit's advantage.** Position on the stack, the agent
   harness, and the enforced design direction.
4. **Constraints that a test enforces are product features.** The design direction and
   accessibility floors are machine-checked; treat breaking them as a build failure, not a taste
   disagreement.
5. **Distribution honesty.** Until the kit is published, every path forward is clone-the-repo or
   read-the-guide.

## Accessibility & Inclusion

WCAG 2.1 Level AA is the standing requirement, enforced rather than aspirational: the 4.5:1
contrast floor is asserted in `e2e/home-accessibility.spec.ts` against the live tokens, and a skip
link, keyboard navigation, and screen-reader support are existing commitments with test coverage.
