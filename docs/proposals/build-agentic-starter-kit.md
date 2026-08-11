---
status: proposal
type: feature
created: 2026-08-10
modified: 2026-08-10
repo-name: astro-basics
---

# Proposal: Build An Agentic Starter Kit From astro-basics

> **Deprecated.** The authoritative artifact is the saved prompt at
> `docs/prompts/proposal-build-agentic-starter-kit.md`. This copy is written for
> one deprecation release (plan-agent 6.0.0) and is removed in 6.1.0. Edit the
> prompt, not this file.

> This is a proposal for review, not an execution plan. It captures a measured
> survey of the repo's agentic surface, application architecture, and deploy
> portability, and proposes nine sequenced features. The load-bearing decisions
> are resolved (see Locked decisions); execution is handed off (see Next step).

## TL;DR

astro-basics is already one of the most agentically-instrumented repos you will
find — 5,224 lines of AI instruction across 33 files, 8 subagents, 16 slash
commands, 73 npm scripts, 5 CI workflows including two Claude-triggered ones —
and almost none of it is agent-_operable_. Every affordance is prose describing
a capability rather than executable surface an agent can invoke and verify: the
gates are pre-broken (127 type errors, ~49 vitest failures, both
`continue-on-error` in CI), three slash commands describe capabilities with no
backing script, and `npm run db:wizard` — whose own source comment reads
"Interactive setup for non-developers" — crashes before printing its first
prompt on a fresh clone. The recommended path is not "add AI to the repo" but
"make the repo's existing capability executable and verifiable, then delete the
prose that lies." Nine features, sequenced so a trustworthy green gate and a
working first run come before any new agent machinery.

## Context

The idea: make astro-basics agentic — a repo a non-developer can hand to Claude
Code, which then sets it up, customizes it into any app, deploys it to Netlify,
Vercel, or Cloudflare, and manages its content through an AI-driven CMS rather
than a traditional one. The ask explicitly spans setup, how we code, how we
build extensions, how we build modules, and how we build pages.

What already exists, grounded in measurement of the worktree at commit `ee23d1e`:

**The agentic surface is large and partly broken.**

- AI-instruction corpus: **5,224 lines across 33 files** — `CLAUDE.md` (412),
  `CLAUDE-PATTERNS.md` (966), `CLAUDE-ANTI-PATTERNS.md` (956),
  `CLAUDE-VALIDATION.md` (615), `CLAUDE.md.backup` (623), `AGENTS.md` (357),
  plus two divergent Copilot files and 24 files under `.github/instructions/`.
- `CLAUDE.md` links `CLAUDE.md.backup` as the "Full CLAUDE.md" — a pre-refactor
  snapshot dated 2025-01-15 — and points at `src/content/config.ts`, which does
  not exist. The real file is `src/content.config.ts` (Astro v5+ location).
- `.github/instructions/` holds 24 files of which **9 are exact-name duplicate
  pairs** (`X.instructions.md` and `ts-X.instructions.md`).
- A file named `". cursorrules"` — with a literal space after the dot — exists
  at 96 lines. A real `.cursorrules` does not. Cursor can never load it.
- `copilot.instructions.md` (371 lines) is titled for a **different project**
  (`@shawnsandy/astro-kit`); `.github/copilot-instructions.md` (347) is a
  second, divergent Copilot file.
- `.claude/agents/` holds 8 files: **1 will not register**
  (`astro-basics-release-manager.md`, 388 lines, no frontmatter), **1 declares
  non-existent tool names** (`css-refactor-agent.md`), and **2 are duplicate
  pairs**.
- `.claude/commands/` holds 16 commands. **Three — `db-health`, `db-cleanup`,
  `db-debug` — describe capabilities with no backing npm script.**
  `pull-request.md` is 1 line with no body.
- The single hook, `.claude/hooks/css-refactor-hook.js`, is **registered
  nowhere** and its own CONFIG block is fully commented out.
- There is **no committed `.claude/settings.json`** — only
  `settings.local.json`, which a fresh cloner never receives. It carries 24
  allow entries including a full 30-line git commit message and 4 grants for
  `openspec`, a tool referenced zero times anywhere in the repo.

**The gates are red by policy, not by accident.**

- `npm run type-check` fails with **exactly 127 errors across 25 files**.
- `.github/workflows/ci.yml` carries an inline comment acknowledging "the repo
  currently carries ~127 pre-existing type errors" and runs type-check with
  `continue-on-error: true`, alongside ~49 known vitest failures. CI hard-gates
  only 4 named test files.
- Root causes trace to `tsconfig.json` enabling `exactOptionalPropertyTypes` and
  `noUncheckedIndexedAccess` on top of `strict`.

**The non-developer path is hard-broken at step one.**

- **20 of 24** `db:*` / `setup:*` scripts run `node --env-file=.env`. Node
  treats a missing `--env-file` target as a fatal startup error — verified
  directly.
- Consequence: on a fresh clone with no `.env`, `npm run db:wizard` — described
  at `scripts/setup-wizard.js:5` as "Interactive setup for non-developers" —
  dies before its first prompt.
- README documents port 4321; `.claude/launch.json` uses 4330/4331.
- README does not mention that `npm test` and `npm run type-check` are red on a
  clean checkout.

**The static core is a genuine, measured asset.** Homepage, `/posts/*`,
`/content/*`, `/guide/**` (28 Starlight pages), RSS, and sitemap require **no
database and no Clerk keys**. Every service touchpoint is already guarded and
degrades to a 503 or an alert div rather than crashing.

**Content is git-native already, with an accidental review gate.**
`src/content.config.ts` defines 3 collections: `posts` (4 entries), `content`
(1), `docs` (28). `baseSchema` requires `title`, `pubDate`, `description`,
`author`; **`publish` defaults to `false`**. There is **zero content-authoring
automation** — all 16 commands are DB/CSS/PR-oriented.

**Deploy portability is 2-of-3 today.** `astro.config.mjs` uses
`output: 'server'` with a runtime switch on `ASTRO_ADAPTER` → node / vercel /
netlify. All three adapters are installed; **`@astrojs/cloudflare` is not.**
Netlify↔Vercel is effectively a one-env-var switch: no adapter-specific imports
in `src/`, and zero filesystem writes anywhere in `src/`.

**External grounding.** CloudCannon's analysis of git-based vs headless CMS for
AI argues markdown-in-git is a native LLM format — agents see templates,
components, and content in one context with no API, auth, or pagination tax.
GitCMS already commercializes "turn Claude into a content agent" over MCP.
Sanity's rebuttal is the honest counterweight: at scale, git-native content
re-invents permissions, localization, and asset management. Astro's docs confirm
four official adapters switched via `npx astro add <platform>`, so portability is
cheap _provided_ the codebase stays Workers-clean. The agentic-starter landscape
is crowded with AI _configuration_ templates and nearly empty of working
_applications_.

## Core finding

> astro-basics is already one of the most agentically-instrumented repos you
> will find — and almost none of it is agent-_operable_, because every
> affordance is prose describing a capability rather than executable surface an
> agent can invoke and verify; the gap is not missing AI guidance but that
> nothing an agent does here can be checked, and much of what it reads is false.

## Side-by-side

| Dimension                          | What an agentic starter requires       | astro-basics today (measured)                                                |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| Verifiable gate                    | Agent can prove it broke nothing       | **No.** 127 type errors, ~49 vitest failures, both `continue-on-error` in CI |
| Executable setup                   | Agent _runs_ setup, not reads about it | **No.** `db:wizard` ("for non-developers") crashes on fresh clone            |
| Content scaffolding                | Agent creates a post/page from schema  | **No.** Zero content generators; 0 of 16 commands touch content              |
| Component scaffolding              | Agent scaffolds to house rules         | **No.** 57 components, strict rules, only VS Code snippets                   |
| Truthful instructions              | Every path and command resolves        | **No.** Backup linked as authoritative; 3 phantom commands                   |
| Agent registry integrity           | Every declared agent loads             | **No.** 8 agents → 1 unregisterable, 1 invalid tools, 2 duplicate pairs      |
| Shared config                      | Fresh cloner inherits the setup        | **No.** No committed `.claude/settings.json`                                 |
| Deploy portability                 | One command per platform               | **Partial.** Netlify↔Vercel is one env var; Cloudflare absent + 4 blockers   |
| Zero-config first run              | Something works immediately            | **Yes — the hidden asset.** Static core needs no DB and no Clerk keys        |
| Agent-authored content review gate | Human approves before publish          | **Yes — accidental.** `publish` defaults to `false` in zod schema            |

## Locked & resolved decisions

Settled before this draft:

1. **Claude Code is the first-class target.** Deepen existing CLAUDE.md / skills
   / hooks / commands machinery rather than a tool-neutral AGENTS.md backbone.
2. **The AI CMS is repo-native.** Content stays as MDX in git; the agent
   authors, edits, and publishes via commits. The agent _is_ the CMS.

Resolved in the 2026-08-10 review:

3. **Prune in place — astro-basics becomes the starter.** No extracted template.
   Accumulated weight must be actively deleted (Feature H).
4. **Fix the baseline to green before building agent machinery.** An agent
   without a trustworthy gate either tries to fix 127 unrelated errors or learns
   to ignore red entirely.
5. **Collapse the instruction corpus to a thin CLAUDE.md plus invocable skills.**
   Pattern knowledge moves from prose into skills that generate correct code.
6. **Capability is packaged skills-first.** Chosen for speed and flexibility over
   the testability of script-backed capability. **Makes Feature I non-optional** —
   skills-first is the mechanism that produced the three phantom `db-*` commands.
7. **Both security defects are in scope, early.** Auth must fail _closed_; the
   unauthenticated service-role endpoint must be deleted or DEV-gated.
8. **Cloudflare is deferred to its own feature.** No "deploy anywhere" claim in
   the README until Feature G lands.
9. **Zero-config static-first is the default posture.** A fresh clone runs with
   no env vars at all.

## Workstreams

### A — Green baseline (prerequisite for autonomy)

Bring `type-check` and `npm test` to green, then remove `continue-on-error` from
`.github/workflows/ci.yml`. Scope: 127 type errors across 25 files, ~49 vitest
failures, and integration tests requiring live Supabase credentials (move behind
an explicit opt-in project). This feature changes no behaviour.

### B — Zero-config first run (highest leverage, smallest work)

Guard the `--env-file=.env` crash across 20 scripts. Make auth fail closed —
`src/middleware.ts` currently omits `authMiddleware` entirely when Clerk keys are
placeholders, leaving `/dashboard`, `/forum`, `/organization` publicly reachable.
Delete or DEV-gate `src/pages/api/test/sync-user.ts`. Rewrite README's opening
for a non-developer. Reconcile the port drift.

### C — Instruction corpus collapse

Delete `CLAUDE.md.backup`, `copilot.instructions.md`, `". cursorrules"`, and the
9 duplicate pairs. Fix the `src/content/config.ts` reference. Commit a real
`.claude/settings.json`.

### D — Agent capability skills

`.claude/skills/` entries for scaffolding a page, a component, an API endpoint,
and an extension/module. Repair the agent registry. Resolve the 3 phantom `db-*`
commands. Depends on A, C, I.

### E — Repo-native AI CMS

A content-authoring skill that reads `baseSchema`, emits valid frontmatter, and
defaults `publish: false`. Fix `src/pages/docs/[page].astro:13`. Move the
hardcoded Starlight sidebar to `autogenerate` where possible.

### F — Netlify and Vercel deploy story

Document and script the `ASTRO_ADAPTER` switch and a Vercel deploy command to
match the existing Netlify scripts. Remove the hardcoded ngrok host.

### G — Cloudflare portability (deferred)

Add `@astrojs/cloudflare` and clear the 4 measured blockers (Appendix C).

### H — Repo pruning

12 orphaned migration scripts, the duplicate `ContactFormView.tsx`, orphaned
SCSS, committed CSS build artifacts, the `project-docs/` numbering collision, the
devcontainer Node version conflict.

### I — Referential-integrity CI check

Fail CI when any command, script, path, or agent referenced in `.claude/**` or
the instruction files does not resolve. The compensating control for decision 6.

## Risks & tensions

- **Feature A is large, unglamorous, and blocks the interesting work.** If it
  stalls, the fallback is a scoped gate — but as a conscious downgrade, not drift.
- **Skills-first has no compile-time truth.** Feature I catches broken
  _references_, not skills that resolve correctly and still produce wrong code.
- **"Prune in place" means the opinionated features stay.** No eject path is
  scoped here.
- **Git-native CMS has a known ceiling** — permissions, localization, assets.
- **Deleting instructions can delete load-bearing knowledge.** Migrate into
  skills before deleting prose.
- **The dual package identity is unresolved.** `exports`/`files` declare a
  component library that `"private": true` cannot publish and whose `files` list
  omits re-exported components.

## Open questions (decisions only)

- Does the component-library identity survive the starter conversion?
- What is the eject story for the opinionated features (forum, dashboard,
  organization)?
- Does the Starlight guide remain the documentation home alongside
  `project-docs/`?

## Roadmap

| Phase | Feature                                               | Size | Depends on |
| ----- | ----------------------------------------------------- | ---- | ---------- |
| 1     | B — Zero-config first run (incl. both security fixes) | M    | —          |
| 2     | A — Green baseline; remove CI `continue-on-error`     | L    | —          |
| 3     | C — Instruction corpus collapse                       | M    | —          |
| 4     | I — Referential-integrity CI check                    | S    | C          |
| 5     | D — Agent capability skills                           | M    | A, C, I    |
| 6     | E — Repo-native AI CMS                                | M    | D          |
| 7     | H — Repo pruning                                      | S    | C          |
| 8     | F — Netlify + Vercel deploy story                     | S    | B          |
| 9     | G — Cloudflare portability                            | L    | F          |

Phases 1 and 2 are independent and may run in parallel.

## Appendix A — Measured baseline (worktree at `ee23d1e`, 2026-08-10)

| Metric                | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| AI-instruction corpus | 5,224 lines / 33 files                                        |
| `type-check` errors   | 127 across 25 files                                           |
| Known vitest failures | ~49 (per `ci.yml`)                                            |
| Unit tests            | 34 files, 528 cases                                           |
| E2E tests             | 10 specs, 48 cases (homepage-dominant)                        |
| `src/` files          | 203                                                           |
| Components            | 57 (35 astro, 8 react, 7 dashboard, 4 views, 1 top-level)     |
| Hydrated components   | 5 distinct (8 real `client:*` uses; 13 more in docs examples) |
| Pages                 | 30 `.astro` + `rss.xml.js`                                    |
| API endpoints         | 8 files, 15 HTTP handlers                                     |
| Content entries       | posts 4 (3 published), content 1, docs 28                     |
| npm scripts           | 73                                                            |
| `scripts/` files      | 71 (~12 orphaned one-off migrations)                          |
| `project-docs/`       | 113 files, 18 dirs                                            |
| Slash commands        | 16 (3 phantom, 1 empty)                                       |
| Subagents             | 8 (1 unregisterable, 1 invalid tools, 2 duplicate pairs)      |
| Authored SCSS         | 11 files, 5,623 LOC (`_utility.scss` alone is 3,756)          |

## Appendix B — Defect register (agentic surface)

| Defect                                | Location                                            | Class      |
| ------------------------------------- | --------------------------------------------------- | ---------- |
| `db:wizard` crashes on fresh clone    | 20 scripts using `node --env-file=.env`             | Blocker    |
| Auth fails open when Clerk keys unset | `src/middleware.ts`                                 | Security   |
| Unauthenticated service-role write    | `src/pages/api/test/sync-user.ts`                   | Security   |
| Backup linked as authoritative        | `CLAUDE.md` → `CLAUDE.md.backup`                    | Truth      |
| Nonexistent path referenced           | `CLAUDE.md` → `src/content/config.ts`               | Truth      |
| Copilot file for a different project  | `copilot.instructions.md`                           | Truth      |
| Unloadable rules file                 | `". cursorrules"` (space after dot)                 | Dead       |
| Duplicate instruction pairs           | 9 pairs in `.github/instructions/`                  | Dead       |
| Phantom commands                      | `db-health`, `db-cleanup`, `db-debug`               | Phantom    |
| Empty command                         | `.claude/commands/pull-request.md`                  | Phantom    |
| Unregistered, commented-out hook      | `.claude/hooks/css-refactor-hook.js`                | Dead       |
| No committed shared config            | `.claude/settings.json` absent                      | Onboarding |
| Skill grant for a non-skill           | `Skill(design-token-extractor)`                     | Phantom    |
| Dead paginated route                  | `src/pages/docs/[page].astro:13`                    | Bug        |
| Nonexistent redirect target           | `/sign-in` redirects; route is `/login`             | Bug        |
| Port drift                            | README 4321 vs `launch.json` 4330/4331              | Truth      |
| Node version conflict                 | devcontainer Node 20 vs `engines.node: ">=22.12.0"` | Config     |

## Appendix C — Cloudflare blockers (Feature G scope)

| Blocker                | Location                                                    | Why it breaks                                                                                      |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `isIP` from `node:net` | `src/utils/ip-validation.ts:12`, used `:60`                 | Unavailable on Workers even with `nodejs_compat`; on the request path via middleware rate limiting |
| `sharp` image service  | `package.json`; no `image:` block in `astro.config.mjs`     | Astro's default sharp service is not Workers-compatible                                            |
| In-memory rate limiter | `src/utils/rate-limiter.ts:83-290`, `setInterval` at `:239` | Per-isolate state; module-scope `setInterval` is hostile to the Workers lifecycle                  |
| No adapter installed   | `@astrojs/cloudflare` absent                                | Adapter switch has no Cloudflare branch                                                            |

Non-blockers: `randomUUID` from `node:crypto` works with `nodejs_compat`; Netlify
form markup is gated behind `CONTACT_INFO.isNetlify` (hardcoded `false`) — except
`src/components/react/ContactForm.tsx:89`, which hardcodes `data-netlify="true"`
with no gate.

## Appendix D — Content-authoring I/O contract (Feature E input)

From `src/content.config.ts`, `baseSchema` shared by `posts` and `content`:

| Field            | Type                           | Required | Default     |
| ---------------- | ------------------------------ | -------- | ----------- |
| `title`          | string                         | yes      | —           |
| `pubDate`        | date                           | yes      | —           |
| `description`    | string                         | yes      | —           |
| `author`         | string                         | yes      | —           |
| `breadcrumbSlug` | string                         | no       | —           |
| `image`          | `{ url, alt, caption? }`       | no       | —           |
| `tags`           | string[]                       | no       | —           |
| `publish`        | boolean                        | no       | **`false`** |
| `featured`       | boolean                        | no       | `false`     |
| `youtube`        | `{ id, title?, start?, end? }` | no       | —           |

The `publish: false` default is the review gate. A content-authoring skill must
emit all four required fields and must not set `publish: true` on its own.

## Next step

Convert to an execution plan:

```bash
/plan-agent:implementation-plan author an execution plan from the proposal prompt at docs/prompts/proposal-build-agentic-starter-kit.md
```
