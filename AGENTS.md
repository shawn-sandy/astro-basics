# Repository Guidelines

## Project Structure & Module Organization

- Source: `src/` (Astro pages in `src/pages/`, components in `src/components/astro` and `src/components/react`, layouts in `src/layouts`, utilities/libs in `src/libs`, content in `src/content`).
- Public assets: `public/` (icons, images, client scripts under `public/scripts`).
- Tests: unit in `tests/`; end‑to‑end in `e2e/`.
- Tooling/config: root `astro.config.mjs`, `vite.config.ts`, `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`.
- Data/DB: `db/` and `scripts/` for setup, migrations, and seeds.
- Docs: `docs/` for guides, security notes, and integration references.

## Getting Started

- Install: `npm install` and `npm run prepare` (Husky hooks).
- Env: `cp .env.example .env` then add Clerk and DB keys.
- Develop: `npm run start` (dev + SCSS) or `npm run dev`.

## Build, Test, and Development Commands

- `npm run dev`: Start Astro dev server (opens at localhost:4321).
- `npm run start`: Dev server + SCSS watcher.
- `npm run build`: Production build to `dist/`.
- `npm run preview`: Serve the production build locally.
- `npm test`: Run unit tests with Vitest.
- `npm run test:e2e`: Run Playwright E2E tests; `npm run test:e2e:report` shows report.
- `npm run lint:all` / `npm run fix:all`: Check/fix ESLint, Stylelint, Prettier, types.
- DB utilities: `npm run db:setup`, `db:migrate`, `db:seed:messages` (requires `.env`).

## Coding Style & Naming Conventions

- Formatting: Prettier (2‑space indent); run `npm run format`.
- Linting: ESLint (Astro/TS/React) and Stylelint for `css/scss`.
- Components: PascalCase (`Header.astro`, `UserProfile.tsx`).
- Utilities/types: camelCase/kebab‑case as established (e.g., `content.ts`, `formErrors.ts`).
- SCSS partials: underscore prefix (e.g., `src/styles/components/_card.scss`).
- Details: see `docs/LINTING_GUIDE.md` and `CONTRIBUTING.md`.

## Testing Guidelines

- Unit tests: Vitest in `tests/` (name `*.test.ts`). Run with `npm test`.
- E2E: Playwright in `e2e/` (name `*.spec.ts`). Run with `npm run test:e2e`.
- Place tests near related modules when practical; cover critical paths and error cases.
- Reference: `docs/E2E_TESTING.md` and `docs/E2E_WORKFLOW_IMPLEMENTATION.md`.

## Commit & Pull Request Guidelines

- Commits: Conventional Commits (e.g., `feat: add pagination`, `fix: handle null email`).
- Branches: `feat/*`, `fix/*`, `docs/*` as applicable.
- Before PR: `npm run fix:all && npm run type-check && npm test && npm run test:e2e && npm run build`.
- PRs: Clear description, linked issues (`Closes #123`), screenshots for UI, notes on breaking changes.
- More in: `CONTRIBUTING.md`.

## Security & Configuration

- Copy `.env.example` to `.env` and set required keys (Clerk, DB, etc.). Never commit secrets.
- Review `docs/SECURITY.md` and database docs before running `db:*` scripts.
- Netlify deploys use `netlify.toml`; local preview via `npm run preview`.
- Related: `docs/audits/SECURITY_AUDIT_REPORT.md`, `docs/DATABASE_SETUP.md`, `docs/TURSO_README.md`.

## Agent Templates & Reference Docs

- Agents: `docs/agents/documentation.md`, `docs/agents/security-audit.md`, `docs/agents/release-execution.md`, `docs/agents/agent-coordination-system.md`.
- PWA: `docs/PWA_SETUP.md` for service worker and caching guidance.
- Auth/DB: `docs/guides/clerk-supabase-setup.md`, `docs/integrations/supabase-setup-guide.md`, `docs/integrations/supabase.md`, `docs/clerk-supabase-native-integration-2025.md`.
- Testing plans: `docs/testing-implementation-plan.md`, `docs/AUTH_TESTING_PLAN.md`.

## PRD Links

- Auth System: `docs/PRD/authentication-system-prd.md`.
- Clerk + Supabase: `docs/PRD/clerk-supabase-integration-prd.md`, `docs/PRD/clerk-supabase-setup-instructions.md`, `docs/PRD/clerk-supabase-advanced-features.md`.
- Newsletter: `docs/PRD/newsletter-system-prd.md`.
- Message Security: `docs/PRD_MESSAGE_SECURITY_2025-01-12.md`.
