---
type: proposal
intent: Convert astro-basics into a Claude Code-first agentic starter kit a non-developer can hand to an agent to set up, customize, extend, and deploy, with a repo-native AI-driven CMS.
techniques: Long-context grounding, XML structure, Comparison tables, Positive framing, Output format
created: 2026-08-10
modified: 2026-08-11
status: converged
repo-name: astro-basics
generated-sha: 5614a6a2e46576bec4fa6f50bf4c0427d94baab68725259c79075076ce8a91f0
---

# Proposal: Build An Agentic Starter Kit From astro-basics

> This is a proposal for review, not an execution plan. It carries the
> grounded research and the decisions already made; the final instruction
> below hands off to drafting an execution plan from it.

<tldr>
astro-basics is already one of the most agentically-instrumented repos you will
find — 5,224 lines of AI instruction across 33 files, 8 subagents, 16 slash
commands, 73 npm scripts, 5 CI workflows including two Claude-triggered ones —
and almost none of it is agent-*operable*. Every affordance is prose describing
a capability rather than executable surface an agent can invoke and verify: the
gates are pre-broken (127 type errors, ~49 vitest failures, both
`continue-on-error` in CI), three slash commands describe capabilities with no
backing script, and `npm run db:wizard` — whose own source comment reads
"Interactive setup for non-developers" — crashes before printing its first
prompt on a fresh clone. The recommended path is not "add AI to the repo" but
"make the repo's existing capability executable and verifiable, then delete the
prose that lies." Nine features, sequenced so a trustworthy green gate and a
working first run come before any new agent machinery.
</tldr>

<context>
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
  non-existent tool names** (`css-refactor-agent.md`: `Bash:read`,
  `FileEditor`, `CodebaseSearch`), and **2 are duplicate pairs**
  (`code-reviewer` / `astro-basics-code-reviewer`, `release-manager` /
  `astro-basics-release-manager`).
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
  `noUncheckedIndexedAccess` on top of `strict`. Error families: TS2375, TS18048
  (9 in `email-validation.ts` alone), TS2484 (9 in
  `src/types/design-tokens.ts:489-497`), TS2339
  `Property 'role' does not exist on type 'never'`.

**The non-developer path is hard-broken at step one.**

- **21 scripts run `node --env-file=.env`** — 16 of the 22 `db:*` / `setup:*`
  scripts (neither `setup:*` entry is affected), plus 5 `test:*` scripts. Node
  treats a missing `--env-file` target as a fatal startup error — verified
  directly.
- Consequence: on a fresh clone with no `.env`, `npm run db:wizard` — described
  at `scripts/setup-wizard.js:5` as "Interactive setup for non-developers" —
  dies before its first prompt. The `cp .env.example .env` that prevents this is
  in an earlier, separately-numbered README step, unenforced and unchecked.
- README documents port 4321; `.claude/launch.json` uses 4330/4331.
- README does not mention that `npm test` and `npm run type-check` are red on a
  clean checkout. A non-developer running the documented command sees 127 errors
  and reasonably concludes they broke it.

**The static core is a genuine, measured asset.**

- Homepage, `/posts/*`, `/content/*`, `/guide/**` (28 Starlight pages), RSS, and
  sitemap require **no database and no Clerk keys**. Every service touchpoint is
  already guarded and degrades to a 503 or an alert div rather than crashing.
- `src/pages/api/message-us.ts:18-40` try/catches `getDatabase()` and returns
  HTTP 503; `src/pages/dashboard/messages.astro:10-28` renders an alert;
  `middleware.ts`'s `updateUserLastSignIn()` early-returns and is
  fire-and-forget.

**Content is git-native already, with an accidental review gate.**

- `src/content.config.ts` defines 3 collections: `posts` (4 entries), `content`
  (1), `docs` (28, via Starlight's `docsLoader()`).
- `baseSchema` requires `title`, `pubDate`, `description`, `author`; and
  **`publish` defaults to `false`**.
- Filtering on `data.publish === true` happens at `posts/[page].astro:23`,
  `content/[page].astro:14`, `docs/[page].astro:13`.
- There is **zero content-authoring automation** — no generator, no template, no
  slash command creates an MDX post. All 16 commands are DB/CSS/PR-oriented.

**Deploy portability is 2-of-3 today.**

- `astro.config.mjs` uses `output: 'server'` with a runtime IIFE switch on
  `process.env.ASTRO_ADAPTER` → node / vercel / netlify, defaulting to netlify.
  All three adapters are installed. **`@astrojs/cloudflare` is not.**
- Netlify↔Vercel is effectively a one-env-var switch: no adapter-specific
  imports in `src/`, and **zero filesystem writes anywhere in `src/`**.
- Cloudflare has 4 concrete blockers (Appendix C).

**External grounding.** CloudCannon's analysis of git-based vs headless CMS for
AI argues markdown-in-git is a native LLM format — agents see templates,
components, and content in one context with no API, auth, or pagination tax.
GitCMS already commercializes "turn Claude into a content agent" over MCP,
confirming the pattern works; astro-basics can ship it repo-native without the
SaaS dependency. Sanity's rebuttal is the honest counterweight: at scale,
git-native content re-invents permissions, localization, and asset management.
For a starter kit that is an acceptable ceiling, and it should be stated rather
than discovered. Astro's own docs confirm four official adapters switched via
`npx astro add <platform>`, with per-route `prerender` control — so platform
portability is cheap _provided_ the codebase stays Workers-clean.

Surveying the agentic-starter landscape (agentic-engineering-starter-pack, the
`claude-code-template` GitHub topic, my-claude-code-setup) shows the space is
crowded with AI _configuration_ templates and nearly empty of working
_applications_. A real Astro app with auth, a database, content collections, a
design system, and 528 unit tests that is also fully agent-operable would be
differentiated on exactly the axis nobody occupies.
</context>

<finding>
astro-basics is already one of the most agentically-instrumented repos you will
find — and almost none of it is agent-*operable*, because every affordance is
prose describing a capability rather than executable surface an agent can invoke
and verify; the gap is not missing AI guidance but that nothing an agent does
here can be checked, and much of what it reads is false.
</finding>

<comparison>
| Dimension | What an agentic starter requires | astro-basics today (measured) |
|---|---|---|
| Verifiable gate | Agent can prove it broke nothing | **No.** 127 type errors, ~49 vitest failures, both `continue-on-error` in CI |
| Executable setup | Agent *runs* setup, not reads about it | **No.** `db:wizard` ("for non-developers") crashes on fresh clone; 21 scripts fatal without `.env` |
| Content scaffolding | Agent creates a post/page from schema | **No.** Zero content generators; 0 of 16 commands touch content |
| Component scaffolding | Agent scaffolds to house rules | **No.** 57 components, strict placement rules, only VS Code snippets as scaffolding |
| Truthful instructions | Every path and command resolves | **No.** Backup linked as authoritative; `src/content/config.ts` does not exist; 3 phantom commands |
| Agent registry integrity | Every declared agent loads | **No.** 8 agents → 1 unregisterable, 1 invalid tools, 2 duplicate pairs |
| Shared config | Fresh cloner inherits the setup | **No.** No committed `.claude/settings.json`; all config is `settings.local.json` |
| Deploy portability | One command per platform | **Partial.** Netlify↔Vercel is one env var; Cloudflare absent + 4 blockers |
| Zero-config first run | Something works immediately | **Yes — the hidden asset.** Static core needs no DB and no Clerk keys |
| Agent-authored content review gate | Human approves before publish | **Yes — accidental.** `publish` defaults to `false` in zod schema |
</comparison>

<decisions>
Locked and resolved — treat these as settled; do not reopen them:

Settled before this draft (from the framing exchange):

1. **Claude Code is the first-class target.** Deepen the existing CLAUDE.md /
   skills / hooks / commands machinery rather than building a tool-neutral
   AGENTS.md backbone. Propagates to: Feature C (instruction collapse ships a
   thin CLAUDE.md, not a neutral manifest) and Feature D (capability lands as
   `.claude/skills/`).
2. **The AI CMS is repo-native.** Content stays as MDX in git; the agent
   authors, edits, and publishes via commits. No runtime CMS, no DB-backed
   content API — the agent _is_ the CMS. Propagates to: Feature E entirely, and
   removes any dependency of the content story on Feature B's database posture.

Resolved in the 2026-08-10 review:

3. **Prune in place — astro-basics becomes the starter.** No extracted template,
   no second codebase to keep in sync. Consequence: accumulated weight must be
   actively deleted (Feature H), and `forum` / `dashboard` / `organization`
   remain as opinionated defaults a non-developer must be able to remove.
4. **Fix the baseline to green before building agent machinery.** An agent
   without a trustworthy gate either tries to fix 127 unrelated errors or learns
   to ignore red entirely; both are fatal to autonomous operation. Propagates
   to: Feature A becomes a prerequisite for D and E, and CI's
   `continue-on-error` flags get removed as the definition of done.
5. **Collapse the instruction corpus to a thin CLAUDE.md plus invocable
   skills.** Pattern knowledge moves from prose that describes correct code into
   skills that generate it. Delete `CLAUDE.md.backup`, both Copilot files, the
   `". cursorrules"`, and the 9 duplicate instruction pairs. Propagates to:
   Feature C, and it is the reason Feature I exists.
6. **Capability is packaged skills-first.** Capability lives in
   `.claude/skills/` as instructions the agent follows, chosen for speed and
   flexibility over the testability of script-backed capability. Propagates to:
   Feature D, **and makes Feature I non-optional** — skills-first is precisely
   the mechanism that produced the three phantom `db-*` commands, so a
   referential-integrity check is the compensating control, not a nice-to-have.
7. **Both security defects are in scope, early.** Auth must fail _closed_ when
   Clerk keys are absent, and the unauthenticated service-role endpoint must be
   deleted or DEV-gated. A starter a non-developer deploys must not ship a
   fail-open auth gate. Propagates to: Feature B.
8. **Cloudflare is deferred to its own feature.** Netlify and Vercel ship first
   (near-zero work); Cloudflare becomes a separately-sized workstream carrying
   its 4 known blockers. Propagates to: Features F and G, and forbids any
   "deploy anywhere" claim in the README until G lands.
9. **Zero-config static-first is the default posture.** A fresh clone runs with
   no env vars at all — content site, docs, RSS, sitemap. Auth and database are
   opt-in features an agent adds on request. Propagates to: Feature B, and makes
   the `--env-file` fix load-bearing rather than cosmetic.
   </decisions>

<workstreams>
### A — Green baseline (prerequisite for autonomy)

Bring `npm run type-check` and `npm test` to green, then remove
`continue-on-error` from `.github/workflows/ci.yml` so the gate is real.

Scope: 127 type errors across 25 files, ~49 vitest failures (role-validator,
csrf, ip-validation), and the integration tests that require live Supabase
credentials. Error families are known and clustered (Appendix A), so this is
volume work rather than research: TS18048 from `noUncheckedIndexedAccess`,
TS2484 export conflicts concentrated in `src/types/design-tokens.ts:489-497`,
and TS2339 `never` errors from Supabase generated types in `role-guard.ts` and
`user-sync.ts`.

Seam: this feature changes no behaviour. If a fix requires a behaviour change,
it belongs in another feature and gets a comment naming why.

Decision to respect: integration tests needing live credentials should be moved
behind an explicit opt-in project rather than counted as failures.

### B — Zero-config first run (highest leverage, smallest work)

Make a fresh clone work for a non-developer with no configuration, and make the
first-run path honest.

Scope:

- Guard the `--env-file=.env` crash across all 21 affected scripts — either a
  preflight that copies `.env.example` to `.env` when absent, or dropping
  `--env-file` in favour of in-process loading. This is the single
  highest-leverage fix in the proposal and is roughly one line of shared code.
- **Make auth fail closed.** `src/middleware.ts` currently omits
  `authMiddleware` from the sequence entirely when Clerk keys are placeholders,
  leaving `/dashboard`, `/forum`, and `/organization` publicly reachable with no
  auth. Replace with a guard that blocks or redirects those routes when auth is
  unconfigured.
- **Delete or DEV-gate `src/pages/api/test/sync-user.ts`**, which accepts an
  arbitrary `userId`, calls Clerk, and writes via the Supabase service-role
  client with no auth check and no environment gate.
- Rewrite README's opening for a non-developer: lead with the zero-config run,
  not ~85 lines of feature marketing that front-loads PWA/CSP/RLS jargon.
- Reconcile the port drift (README 4321 vs `launch.json` 4330/4331).
- State the red-baseline status honestly until Feature A lands.

### C — Instruction corpus collapse

Reduce 5,224 lines across 33 files to a thin, true, routing `CLAUDE.md` plus the
skills that carry the knowledge.

Scope: delete `CLAUDE.md.backup` and the link that calls it authoritative;
delete `copilot.instructions.md` (titled for a different project) and reconcile
`.github/copilot-instructions.md`; delete `". cursorrules"`; collapse the 9
duplicate pairs under `.github/instructions/`; fix the `src/content/config.ts`
→ `src/content.config.ts` reference; commit a real `.claude/settings.json` so a
fresh cloner inherits the setup, stripped of the embedded 30-line commit message
and the 4 dead `openspec` grants.

Seam: knowledge that _describes how to write correct code_ moves into Feature D
skills. Knowledge that is genuinely reference (architecture, decision trees)
stays as docs but must resolve — enforced by Feature I.

### D — Agent capability skills

Give the agent invocable capability for the five surfaces the ask names: setup,
coding, extensions, modules, pages.

Scope: `.claude/skills/` entries for scaffolding a page, a component (respecting
the astro/react/dashboard placement rules and the mandated `type Props` export),
an API endpoint (auth-check-first, consistent error shape), and an extension or
module. Repair the agent registry: add frontmatter to
`astro-basics-release-manager.md`, fix the invalid tool grammar in
`css-refactor-agent.md`, resolve the 2 duplicate pairs. Resolve the 3 phantom
`db-*` commands — either back them with scripts or delete them.

Depends on: A (a gate worth running), C (a true instruction base), I (the
control that keeps skills-first honest).

### E — Repo-native AI CMS

Make content authoring a first-class agent operation, using the review gate the
schema already provides.

Scope: a content-authoring skill that reads `baseSchema` from
`src/content.config.ts`, emits valid frontmatter for all four required fields,
and defaults `publish: false` so agent-authored content is invisible until a
human flips it. Fix `src/pages/docs/[page].astro:13`, which filters the `docs`
collection on `data.publish` — a field `docsSchema` never defines and 0 of 28
entries declare, so that paginated route always yields nothing. Move the
hardcoded Starlight sidebar in `astro.config.mjs` to `autogenerate` where
possible, so adding a guide page stops requiring an Astro config edit.

Grounding: the review gate is not new machinery — `publish` already defaults to
`false` in zod, and three routes already filter on it.

### F — Netlify and Vercel deploy story

Make deployment a single agent-invocable operation on the two platforms that
already work.

Scope: document and script the `ASTRO_ADAPTER` switch, per-platform env var
setup, and a deploy command for Vercel to match the existing
`deploy:preview` / `deploy:prod` Netlify scripts. Remove the hardcoded ngrok
host from `astro.config.mjs`.

### G — Cloudflare portability (deferred)

Add `@astrojs/cloudflare` and clear the 4 measured blockers (Appendix C).

Sized separately and explicitly not day-one. Until this lands, no "deploy
anywhere" claim appears in the README.

### H — Repo pruning

Delete accumulated weight so an agent's search space is signal.

Scope: 12 one-off historical migration scripts wired to no npm script; the
near-duplicate `src/views/ContactFormView.tsx` vs
`src/components/react/view/ContactFormView.tsx`; orphaned SCSS
(`_component-sample-tokens.scss`, 318 lines, and `_header.scss`, both unimported
by `index.scss`); the committed CSS build artifacts in `src/styles/`; the
`13-agents/` vs `13-refactorings/` numbering collision in `project-docs/`; the
devcontainer pinned to Node 20 against `engines.node: ">=22.12.0"`.

Note the build-artifact subtlety: `src/layouts/Base.astro:11` imports
`../styles/index.css`, not the SCSS. Astro never compiles the SCSS — the
standalone `sass` CLI does, via `prebuild`. A fresh clone that skips `prebuild`
renders unstyled or stale, so removing the committed CSS requires making the
build step unskippable.

### I — Referential-integrity CI check (compensating control for skills-first)

A check that fails CI when any command, script, path, or agent referenced in
`.claude/**` or the instruction files does not resolve.

This exists because decision 6 chose skills-first. Skills-first is fast and
flexible precisely because it is not executable — and this repo already
demonstrates the failure mode three times over in `db-health`, `db-cleanup`, and
`db-debug`, plus a `Skill(design-token-extractor)` grant for a skill that ships
only as an agent. The check converts that class of drift from invisible to
blocking without giving up the flexibility the decision bought.
</workstreams>

<risks>
- **Feature A is large, unglamorous, and blocks the interesting work.** 127 type
  errors plus ~49 test failures is real volume with no user-visible payoff. The
  temptation to skip to D and E will be strong. Stop-condition: if A stalls, the
  fallback is the scoped-gate option — green-gate only the starter-relevant
  surface and quarantine the rest — but this must be a conscious downgrade, not
  a drift.
- **Skills-first has no compile-time truth.** Decision 6 trades testability for
  speed. Feature I is the mitigation, but a CI check catches broken *references*,
  not skills that resolve correctly and still produce wrong code. Residual risk
  is accepted and named.
- **"Prune in place" means the opinionated features stay.** A non-developer
  cloning this still receives a forum, a dashboard, an organization module, and
  Clerk wiring. Without an eject path they must delete these by hand — and the
  agent must be able to do that safely, which is unscoped work this proposal
  does not cover.
- **Git-native CMS has a known ceiling.** Permissions, localization, and asset
  management are the documented failure modes at scale. Acceptable for a
  starter; it should be stated in the README rather than discovered by a user.
- **Deleting instructions can delete load-bearing knowledge.** 5,224 lines
  accumulated for reasons, and CLAUDE-PATTERNS.md encodes real architectural
  rules. Feature C must migrate knowledge into skills before deleting prose, not
  after.
- **The dual package identity is unresolved.** `package.json` declares `exports`
  and `files` for a component library while `"private": true` and `build` writes
  a site to `dist/`. `src/components/index.ts` re-exports 6 dashboard components
  and 1 React component that `files` omits — a published tarball would have
  broken imports. This proposal does not decide whether the library identity
  survives.
</risks>

<open-questions>
Decisions still owned by the human — surface them, do not answer them:

- **Does the component-library identity survive the starter conversion?** The
  repo currently claims to be both a deployable site and a publishable component
  library, and the two collide in `dist/`. Keeping both means building a real
  `build:lib` step and fixing the `files`/`exports` mismatch; dropping the
  library means deleting `exports`, `files`, and `src/components/index.ts`.
- **What is the eject story for the opinionated features?** "Prune in place"
  leaves forum, dashboard, and organization in the default clone. Whether an
  agent-invocable removal path is in scope — and whether it is a skill or a
  manifest — is a design decision this proposal deliberately left open.
- **Does the Starlight guide remain the documentation home?** The project's own
  standing rule requires features to be documented in both `project-docs/` and
  the Starlight guide. With 113 files in `project-docs/` and 28 in the guide,
  maintaining both under agent authorship doubles the drift surface.
  </open-questions>

<roadmap>
| Phase | Feature | Size | Depends on |
|---|---|---|---|
| 1 | B — Zero-config first run (incl. both security fixes) | M | — |
| 2 | A — Green baseline; remove CI `continue-on-error` | L | — |
| 3 | C — Instruction corpus collapse | M | — |
| 4 | I — Referential-integrity CI check | S | C |
| 5 | D — Agent capability skills | M | A, C, I |
| 6 | E — Repo-native AI CMS | M | D |
| 7 | H — Repo pruning | S | C |
| 8 | F — Netlify + Vercel deploy story | S | B |
| 9 | G — Cloudflare portability | L | F |

Phases 1 and 2 are independent and may run in parallel. Phase 1 is first by
leverage, not by dependency: it is the smallest work with the largest effect on
the stated goal, and it closes two security defects.
</roadmap>

<appendices>
### Appendix A — Measured baseline (worktree at `ee23d1e`, 2026-08-10)

| Metric                | Value                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| AI-instruction corpus | 5,224 lines / 33 files                                                                |
| `type-check` errors   | 127 across 25 files                                                                   |
| Known vitest failures | ~49 (per `ci.yml`)                                                                    |
| Unit tests            | 34 files, 528 cases                                                                   |
| E2E tests             | 10 specs, 48 cases (homepage-dominant)                                                |
| `src/` files          | 203                                                                                   |
| Components            | 57 (35 astro, 8 react, 7 dashboard, 4 views, 1 top-level view)                        |
| Hydrated components   | 5 distinct (8 real `client:*` uses; 13 more are in docs examples)                     |
| Pages                 | 30 `.astro` + `rss.xml.js`; 11 explicit `prerender = true`, 2 `false`, 17 default SSR |
| API endpoints         | 8 files, 15 HTTP handlers                                                             |
| Content entries       | posts 4 (3 published), content 1, docs 28                                             |
| npm scripts           | 73                                                                                    |
| `scripts/` files      | 71 (~12 orphaned one-off migrations)                                                  |
| `project-docs/`       | 113 files, 18 dirs                                                                    |
| Slash commands        | 16 (3 phantom, 1 empty)                                                               |
| Subagents             | 8 (1 unregisterable, 1 invalid tools, 2 duplicate pairs)                              |
| Authored SCSS         | 11 files, 5,623 LOC (`_utility.scss` alone is 3,756)                                  |

### Appendix B — Defect register (agentic surface)

| Defect                                | Location                                                           | Class      |
| ------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `db:wizard` crashes on fresh clone    | 21 scripts using `node --env-file=.env`                            | Blocker    |
| Auth fails open when Clerk keys unset | `src/middleware.ts` (protected matcher bypassed)                   | Security   |
| Unauthenticated service-role write    | `src/pages/api/test/sync-user.ts`                                  | Security   |
| Backup linked as authoritative        | `CLAUDE.md` → `CLAUDE.md.backup`                                   | Truth      |
| Nonexistent path referenced           | `CLAUDE.md` → `src/content/config.ts`                              | Truth      |
| Copilot file for a different project  | `copilot.instructions.md` (`@shawnsandy/astro-kit`)                | Truth      |
| Unloadable rules file                 | `". cursorrules"` (space after dot)                                | Dead       |
| Duplicate instruction pairs           | 9 pairs in `.github/instructions/`                                 | Dead       |
| Phantom commands                      | `db-health`, `db-cleanup`, `db-debug`                              | Phantom    |
| Empty command                         | `.claude/commands/pull-request.md` (1 line)                        | Phantom    |
| Unregistered, commented-out hook      | `.claude/hooks/css-refactor-hook.js`                               | Dead       |
| No committed shared config            | `.claude/settings.json` absent                                     | Onboarding |
| Skill grant for a non-skill           | `Skill(design-token-extractor)` (ships as agent)                   | Phantom    |
| Advertised skill never committed      | `wcag-compliance-reviewer` (`CLAUDE.md:150`, `:157`)               | Phantom    |
| Dead paginated route                  | `src/pages/docs/[page].astro:13` filters undefined field           | Bug        |
| Nonexistent redirect target           | `forum` / `organization` redirect to `/sign-in`; route is `/login` | Bug        |
| Port drift                            | README 4321 vs `launch.json` 4330/4331                             | Truth      |
| Node version conflict                 | devcontainer Node 20 vs `engines.node: ">=22.12.0"`                | Config     |

### Appendix C — Cloudflare blockers (Feature G scope)

| Blocker                | Location                                                    | Why it breaks                                                                                                                            |
| ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `isIP` from `node:net` | `src/utils/ip-validation.ts:12`, used `:60`                 | `node:net` unavailable on Workers even with `nodejs_compat`; on the request path via middleware rate limiting                            |
| `sharp` image service  | `package.json`; no `image:` block in `astro.config.mjs`     | Astro's default sharp service is not Workers-compatible                                                                                  |
| In-memory rate limiter | `src/utils/rate-limiter.ts:83-290`, `setInterval` at `:239` | Per-isolate state; module-scope `setInterval` is hostile to the Workers lifecycle. Already semantically broken on all serverless targets |
| No adapter installed   | `@astrojs/cloudflare` absent                                | Adapter switch has no Cloudflare branch                                                                                                  |

Non-blockers worth noting: `randomUUID` from `node:crypto`
(`src/utils/logger.ts:1`) works with `nodejs_compat`; Netlify form markup is
gated behind `CONTACT_INFO.isNetlify`, hardcoded `false` at
`src/utils/site-config.ts:31` — except `src/components/react/ContactForm.tsx:89`,
which hardcodes `data-netlify="true"` with no gate.

### Appendix D — Content-authoring I/O contract (Feature E input)

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

The `publish: false` default is the review gate: agent-authored content is
invisible on `/posts/[page]`, `/content/[page]` until a human flips it. A
content-authoring skill must emit all four required fields and must not set
`publish: true` on its own.

Current manual creation path (what the skill replaces): hand-create the file
under `src/content/posts/`, hand-write frontmatter, explicitly set
`publish: true`, and — for guide pages — additionally register the page in the
hand-maintained `sidebar` array in `astro.config.mjs` unless it lands in one of
the 3 `autogenerate` directories.
</appendices>

Author an execution plan that converts astro-basics into a Claude Code-first
agentic starter kit, delivering Features A through I in the roadmap order above.
Draft real, actionable steps naming the files each one touches — do not restate
the workstream headings as steps. Treat the nine locked decisions as settled
inputs; in particular, capability is packaged skills-first (decision 6), which
makes Feature I's referential-integrity check a required part of the plan rather
than an optional extra. Carry the three open questions into the plan's
unresolved-questions section rather than answering them. Size the test work
explicitly: Feature A's definition of done is `npm run type-check` and
`npm test` passing with `continue-on-error` removed from
`.github/workflows/ci.yml`.
