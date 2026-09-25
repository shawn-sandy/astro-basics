# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a **non-developer who hands the repository to Claude Code** and asks it to set
the site up, customize it into their own app, extend it, and deploy it. They do not read the
source. They judge the kit by whether the agent can get them from a link to a running site of
their own, and keep it running, without them needing to know git, npm, or what an environment
variable is.

The secondary user is a developer evaluating **Astro Kit** as the starting point for their own
project. They arrive cold, read rendered output next to the source that produced it, and decide
within one session whether the code is worth inheriting. This was the primary audience until the
agentic-starter-kit direction was adopted; it remains a confirmed audience, not a discarded one.

Returning readers of the blog and articles exist, but no surface is optimized for them ahead of
either user above.

## Product Purpose

Astro Kit is an Astro website that a non-developer can hand to Claude Code to set up, customize,
extend, and deploy. It doubles as its own component library and reference implementation, so the
same repository serves the person working through an agent and the developer reading the code.
Until the known security constraints under Capabilities and Constraints are fixed, it is not to be
described as production-ready.

The direction is set by the converged proposal at
`docs/prompts/proposal-build-agentic-starter-kit.md`: make the repository's existing capability
executable and verifiable by an agent, then delete the prose that describes capability without
delivering it. The conversion is in progress, not finished.

Success is a person who never opened the source ending up with a working site of their own,
because the agent could set it up and verify it from the repository alone. For the developer
audience, success is still a clone made because the site showed that the pieces are real.

## Positioning

Three claims a neighbouring Astro starter could not truthfully copy, confirmed with the owner:

1. **The repository is built to be operated by Claude Code.** `CLAUDE.md` plus its patterns,
   anti-patterns, and validation companions, MCP server integrations, and project skills make
   agent-assisted work a first-class property of the codebase. Shipped skills already carry setup
   end to end: `project-setup` walks a non-technical person from clone to an open browser, and
   `auth-and-database-setup` switches on Clerk login and the Supabase database while keeping
   secrets out of the chat.
2. **The full app stack is wired, not stubbed.** Clerk authentication, a hierarchical role system,
   middleware-protected routes, Supabase behind one helper module (`#libs/supabase-native`), CSRF
   protection, rate limiting, an email-delivered contact form, and a dashboard app shell all work
   in the running site once their keys are set. Auth and the database are opt-in; the static core
   runs without them.
3. **The design direction is executable.** Seven tokens and one structural rule, colour marks
   interactivity, enforced by end-to-end tests that fail when a non-interactive element takes the
   accent or when contrast drops below AA.

The agent claim leads because it is what the primary user is buying. The stack and design claims
are what the agent is operating on, and what the secondary developer audience checks.

Explicitly **not** claimed:

- Server-rendered components that ship zero client JavaScript. That is Astro's baseline behaviour,
  not something this kit adds, and leading with it positions the product against nothing. This
  was a deliberate exclusion, not an omission.
- A repo-native AI CMS. It is a locked decision in the proposal but has not shipped; no
  content-authoring skill exists yet.
- "Deploy anywhere." Netlify and Vercel ship first; Cloudflare is a deferred workstream, and the
  proposal forbids the claim until it lands.

## Operating Context

- The primary user works inside Claude Code with a fresh clone. The agent reads `CLAUDE.md` and the
  project skills, runs setup, and the person sees the result as a site open in their browser and,
  later, a deploy. The person's contact with the product is the conversation and the rendered
  site, not the code.
- The secondary user is a developer on a desktop browser, comparing this against other Astro
  starters and against building from scratch. They evaluate by reading rendered output beside its
  source and by following through to the Starlight guide at `/guide/`.
- The public surface spans a homepage, a blog (`/posts/`), articles (`/content/`), tags, about, and
  contact. The authenticated surface spans `/dashboard` (a sidebar app shell that collapses to a
  top bar below 64rem, with `/dashboard/users`), `/organization`, and `/profile`.
- Deployment defaults to Netlify, with Vercel and Node adapters selectable through
  `ASTRO_ADAPTER`. Cloudflare is not supported yet.

## Capabilities and Constraints

- **Zero-config, static-first.** A fresh clone is meant to run with no environment variables:
  content site, docs, RSS, sitemap. Auth and the database are opt-in features an agent adds on
  request (proposal decision 9).
- **Prune in place.** There is no separate template; astro-basics itself is the starter. The
  dashboard and organization modules and the Clerk wiring stay as opinionated defaults. A
  non-developer must be able to have the agent remove them, and no eject path exists yet.
- **Distribution: clone or use as a template.** People fork or clone the GitHub repository and
  build from it. `package.json` is `private: true`, and its `exports` field for
  `src/components/astro/*.astro` is vestigial. No install command is truthful today. Any call to
  action must point at the repository, the guide, or the setup skills.
- Astro in SSR mode (`output: 'server'`) with selective React hydration.
- 37 `.astro` components and 8 React components in the library, plus 13 dashboard components.
  Four of the React components (`Alert`, `ContactForm`, `RoleBadge`, `RoleGuard`) have
  Storybook 10 stories.
- Three content collections (`posts`, `docs`, `content`) authored in MDX with a shared schema and
  a `publish: true` gate. `publish` defaults to `false`, which gives agent-authored content a
  human review step before it goes public.
- Documentation is served by Starlight under `/guide/`, titled "Astro-Basics Guide", separate from
  the main site's own layout.
- **Supabase is the only database**, accessed through `#libs/supabase-native` and
  `#libs/supabase-auth`. Migrations live in `scripts/migrations/` and are applied with `psql`.
- The contact form stores nothing. Each submission is delivered only as an email, and the endpoint
  returns 503 unless email is configured.
- Light and dark themes, with a toggle that overrides the OS preference.
- Internal imports use `#` path aliases.
- Progressive web app: service worker, offline page, install prompt, standalone mode.

Known constraints:

- `/docs` requests a `docs` collection entry, `0-welcome`, that does not exist, and has answered
  500 because of it. `/guide/components/` is the working component index.
- **Auth fails open without Clerk keys.** When the keys are absent the auth middleware is left out
  of the chain entirely, so `/dashboard` and `/organization` are not protected. The proposal
  (decision 7) requires auth to fail closed before a non-developer deploys; it has not been fixed.
  The route matcher also still lists `/forum`, which no longer exists.
- **`POST /api/test/sync-user` is unauthenticated, with or without Clerk keys.** It sits outside
  the protected routes, and neither the CSRF middleware (which only issues tokens) nor rate
  limiting (contact form only) guards it. Given any Clerk user ID, it upserts that user's row with
  the Supabase service-role client, bypassing RLS, and returns the user's email, username, name,
  image and last sign-in time; failures return raw Supabase and Clerk errors. The same decision
  requires it deleted or limited to development; it is still present.
- Both are tracked in issue #381.

## Brand Commitments

- Name: **Astro Kit** (`SITE_TITLE`). The repository and guide are named `astro-basics` /
  "Astro-Basics Guide"; the two names coexist today and no consolidation has been decided.
- Owner and author: Shawn Sandy. Repository: `github.com/shawn-sandy/astro-basics`. Licence: MIT.
- Tagline in use: "A simple, easy to use multipurpose starter theme for Astro."
- The `--island` accent is a deep petrol, chosen specifically so the page does not read as a
  framework default. It is not to drift toward the sky-blue or violet/indigo families.
- The existing token vocabulary (`ink`, `ink-soft`, `paper`, `paper-sunk`, `island`, `island-bg`,
  `rule`) is the public styling contract for consumers and its names are stable.

## Evidence on Hand

Real and usable:

- Shipped setup skills in `.claude/skills/`: `project-setup`, `auth-and-database-setup`, and
  `verify`, which drives the skills' helper scripts against fake services and a headless Claude
  session.
- A working component library, renderable next to the source that produces it. The homepage hero
  already does exactly this with a live `Card` and the code that generated it.
- A published Starlight guide covering components, API reference, MCP servers, roles, the
  database, email, Storybook, and the design direction.
- Measured accessibility and design-direction results in `e2e/`: `home-accessibility.spec.ts`,
  `homepage-design-direction.spec.ts`, `home-performance.spec.ts`, `home-responsive.spec.ts`,
  `theme-toggle.spec.ts`, `navigation-popover.spec.ts`, and `skip-link.spec.ts`.
- Written contrast measurements taken against the running page, recorded in the design-direction
  guide.
- The converged agentic-starter-kit proposal, with its measured baseline and defect register, at
  `docs/prompts/proposal-build-agentic-starter-kit.md`.

Absent. Future work must not invent these:

- No testimonials, customers, adopters, download counts, stars, or press.
- No pricing, licensing tiers, or commercial offering.
- No case studies or third-party endorsements.
- `src/pages/about.astro` is unmodified Astro-tutorial boilerplate, a fictional "Sarah, technical
  writer in Canada". It is placeholder content, not product truth, and nothing may cite it.
- Feature card imagery currently points at `picsum.photos` placeholders.

## Product Principles

1. **Executable over described.** An agent working for a non-developer can only use capability it
   can run and verify; prose that describes a capability is not one. The same holds for the
   developer audience, who trust a rendered component beside its source more than any claim about
   quality.
2. **Claim only what is wired.** Copy, instructions, and skills that outrun the implementation cost
   more credibility than they buy. A path that does not resolve or a command with no script behind
   it is a false claim, whether a person or an agent reads it.
3. **Safe to hand over.** A starter a non-developer deploys must fail closed. Protection that only
   holds when the person configured it correctly is not protection for this audience.
4. **Constraints that a test enforces are product features.** The design direction and
   accessibility floors are machine-checked; treat breaking them as a build failure, not a taste
   disagreement.
5. **Distribution and deployment honesty.** Until the kit is published, every path forward is
   clone the repo, read the guide, or hand it to the agent. No deploy target is promised before it
   works.

## Accessibility & Inclusion

WCAG 2.1 Level AA is the standing requirement, enforced rather than aspirational: the 4.5:1
contrast floor is asserted in `e2e/home-accessibility.spec.ts` against the live tokens, and a skip
link, keyboard navigation, and screen-reader support are existing commitments with test coverage.
