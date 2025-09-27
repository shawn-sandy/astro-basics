# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `src/` with pages under `src/pages/`, shared layouts in `src/layouts`, and components split between `src/components/astro` and `src/components/react`.
- Content collections reside in `src/content`, while utilities and libs sit in `src/libs`.
- Static assets are stored in `public/` (scripts in `public/scripts`).
- Automated tests are organized in `tests/` for unit coverage and `e2e/` for Playwright suites.
- Database schema, migrations, and seeds are under `db/` and `scripts/`.

## Build, Test, and Development Commands

- `npm run dev`: start the Astro dev server at `localhost:4321`.
- `npm run start`: dev server plus SCSS watcher for rapid styling feedback.
- `npm run build`: bundle production output into `dist/`.
- `npm test`: execute Vitest unit tests in `tests/`.
- `npm run test:e2e`: run Playwright scenarios; follow with `npm run test:e2e:report` for the HTML report.
- `npm run lint:all` / `npm run fix:all`: check or auto-fix ESLint, Stylelint, Prettier, and type issues.

## Coding Style & Naming Conventions

- Format with Prettier (2-space indentation); run `npm run format` before committing.
- Follow ESLint and Stylelint rules for Astro, React, TypeScript, and SCSS.
- Use PascalCase for components (`Header.astro`, `UserProfile.tsx`), camelCase or kebab-case for utilities (`content.ts`, `formErrors.ts`).
- Prefix SCSS partials with underscores (`_card.scss`).

## Testing Guidelines

- Place unit specs in `tests/*.test.ts`; aim to cover error paths and integration surfaces.
- Store Playwright specs in `e2e/*.spec.ts`; reference `docs/E2E_TESTING.md` for workflows.
- Run `npm test` locally before pushing; follow with `npm run test:e2e` when features touch flows or UI.

## Commit & Pull Request Guidelines

- Use Conventional Commits (`feat:`, `fix:`, `docs:`) and group related changes logically.
- Before opening a PR, run `npm run fix:all`, `npm run type-check`, `npm test`, `npm run test:e2e`, and `npm run build`.
- PRs should describe the change, link issues (`Closes #123`), and include screenshots or notes for UI or breaking updates.

## Security & Configuration Tips

- Copy `.env.example` to `.env` and populate Clerk and database keys; never commit secrets.
- Review `docs/SECURITY.md`, `docs/DATABASE_SETUP.md`, and `docs/TURSO_README.md` before running `db:*` commands.
- Netlify deploys read `netlify.toml`; validate production behavior with `npm run preview`.
