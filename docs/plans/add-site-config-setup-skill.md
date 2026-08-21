---
status: todo
type: feature
created: 2026-08-18
issue: https://github.com/shawn-sandy/astro-basics/issues/369
glance: Anyone cloning this starter inherits someone else's site name, description and example.com URL, and has to hunt through three unrelated files to fix it. This adds a guided skill that finds every branding value, shows what is still a placeholder, asks only about those, and writes the answers back without breaking the exports 18 files depend on.
---

# Plan: Turn site branding setup into a guided conversation

## Objective

Add a `site-config` Claude skill that scans this repo's site identity settings, reports which values are still shipped placeholders, asks the user about each one, and writes the confirmed answers back to the files they live in.

## Context

Site identity is spread across three files with three different shapes. `src/utils/site-config.ts` holds six exported constants, `astro.config.mjs:15` holds the canonical site URL, and `package.json` holds the project name. A new site owner has to find all three and edit each by hand, and the shipped values (`Astro Kit`, `https://example.com`, `astro-basics-website`) give no signal about which ones still need attention.

Two constraints shape the approach. First, `src/utils/index.ts:2` re-exports the config module and 18 files import from it, so changing an exported **name** is a build break while changing its **value** is safe — the skill must be allowed to do only the second. Second, `astro.config.mjs:15` reads `process.env.SITE_URL || 'https://example.com'`, so the URL is already env-delegated: a skill that "sets the site URL" by editing that literal would work locally and silently do nothing on any deployment where `SITE_URL` is set. `SITE_URL` is also absent from `.env.example`, so the key is currently undocumented.

The repo already has a convention for this problem shape: PR #368 taught the config layer to treat `.env.example` placeholders as unconfigured, with `tests/placeholder-env-config.test.ts` guarding it. This skill applies the same placeholder-equals-unconfigured rule to branding values.

`astro.config.mjs` carries a second branding value too: `starlight({ title: 'Astro-Basics Guide' })`, which names the documentation section on every `/guide` page and stays visibly wrong on a rebranded site.

Scope boundary: `.claude/skills/project-setup/SKILL.md` already owns the clone/install/`.env`/database walkthrough. This skill must not compete for those trigger words.

The mechanism is conversational — the skill instructs Claude to read, ask via `AskUserQuestion`, and apply edits directly. No wizard script, unlike `scripts/setup-wizard.js`, which exists only because database credentials must be entered outside a chat session.

Known risk: `npm test` and `npm run type-check` are already red on a clean checkout of this repo, so every check below is scoped to the specific file it validates rather than run as a full suite.

## Files

- .claude/skills/site-config/SKILL.md (new) — the scan, ask, and write-back instructions
- tests/site-config-skill.test.ts (new) — skill contract check plus the config shape guard

## Steps

1. Create `.claude/skills/site-config/SKILL.md` with `name: site-config`, `version: 0.1.0`, and a description scoped to site title, description, logo, navigation labels, contact link and site URL, deliberately excluding `install`, `clone`, `npm`, `database` and `.env` phrasing Why: two skills sit in the same directory and the router picks on description alone, so overlapping trigger words would send `project-setup` to a branding request and this skill to an install request Verify: `grep -c` the description for the branding terms returns non-zero and for each of the four excluded terms returns zero.
2. Write the skill's Scan phase — read `src/utils/site-config.ts`, `astro.config.mjs`, the `name` and `description` fields of `package.json`, and `.env.example`, then print one table row per field with its current value and an `unconfigured` marker when the value still equals its shipped placeholder Why: the objective is to show what is already set before asking anything, and treating a shipped placeholder as unconfigured is the convention PR #368 established for env values Verify: run the Scan phase against the current checkout and confirm it marks `SITE_TITLE`, the astro site URL and the package name as unconfigured while leaving `PAGINATION_COUNT` unmarked.
3. Write the Ask phase as four batched `AskUserQuestion` rounds — identity (`SITE_TITLE`, `SITE_DESCRIPTION`, package `name`, the Starlight docs title), address (`SITE_URL`, `SITE_LOGO`), navigation (`BREADCRUMB_ROUTE` entries, `PAGINATION_COUNT`), contact (`CONTACT_INFO` name/url/isNetlify) — with each field's current value offered as an explicit keep-it option Why: `AskUserQuestion` accepts at most four questions per call, and offering the current value as a choice turns the flow into a review of nine fields rather than a re-entry of all nine Verify: every one of the ten fields appears in exactly one round in the written body, and no round carries more than four questions — the identity round sits exactly at that cap.
4. Write the Write-back phase with the shape guard and per-field literal rules — values only and never a renamed, added or removed export; `PAGINATION_COUNT` stays an unquoted number; strings stay single-quoted; `CONTACT_INFO.isNetlify` stays a bare boolean; `BREADCRUMB_ROUTE` entries keep their `{name, url, path}` triple; the Starlight `title` is replaced inside the `starlight({ ... })` call without disturbing its sibling keys; `SITE_URL` is written to `.env` and appended to `.env.example` if the key is missing, with `astro.config.mjs:15`'s literal fallback changed only on explicit confirmation Why: 18 files import these names through `src/utils/index.ts`, so a name change breaks the build, and editing the astro literal alone is a no-op wherever `SITE_URL` is already set in the environment Verify: after a write, `npx tsc --noEmit src/utils/site-config.ts` reports no error and `git diff src/utils/site-config.ts` shows changes only to the right of an `=`.
5. Add `tests/site-config-skill.test.ts` covering both halves — the skill contract (file present, frontmatter keys present, all ten fields and the shape-guard sentence named in the body, none of the four excluded trigger words in the description) and the config shape guard (the module still exports all six names with their expected runtime types) Why: the shape guard is the single check that fails loudly if a later skill run corrupts the file, and the repo keeps topical root-level tests such as `tests/placeholder-env-config.test.ts` Verify: `npx vitest run tests/site-config-skill.test.ts` exits 0 with both describe blocks passing.
6. Dry-run the skill end to end — run its Scan phase against the checkout, then run its Write phase against a copy of `src/utils/site-config.ts` in the scratchpad, and diff the copy Why: the literal-formatting rules are the only non-trivial logic in this plan and reviewing them as prose will not catch a mis-quoted value Verify: the scratch diff shows only right-hand-side changes, and `git diff --quiet src/utils/site-config.ts astro.config.mjs package.json` exits 0 because the real tree was never touched.

## Tests

Tier 1 — This plan changes application code
- Objective: a guided site-config skill exists and declares the full field set it is trusted to rewrite. File: tests/site-config-skill.test.ts; Type: smoke; Asserts: `.claude/skills/site-config/SKILL.md` exists, its frontmatter carries name/description/version, its body names all ten configurable fields and the values-only shape-guard rule, and its description contains none of install/clone/database/.env; Run: npx vitest run tests/site-config-skill.test.ts
- Unit: config module shape guard. File: tests/site-config-skill.test.ts; Targets: the exports of src/utils/site-config.ts; Key cases: all six names still exported, PAGINATION_COUNT is a number, CONTACT_INFO carries name/url/isNetlify, every BREADCRUMB_ROUTE entry carries name/url/path

## Acceptance Criteria

- [ ] `.claude/skills/site-config/SKILL.md` exists with `name`, `description` and `version` frontmatter keys
- [ ] The skill description contains none of `install`, `clone`, `database`, `.env`
- [ ] The skill body names all ten fields: SITE_TITLE, SITE_DESCRIPTION, SITE_LOGO, PAGINATION_COUNT, CONTACT_INFO, BREADCRUMB_ROUTE, the astro site URL, SITE_URL, the package name, and the Starlight docs title
- [ ] The skill body states that write-back changes values only and never renames, adds or removes an export
- [ ] The skill body routes SITE_URL to `.env` rather than treating the astro.config literal as the deployed value
- [ ] `npx vitest run tests/site-config-skill.test.ts` exits 0
- [ ] A dry run of the skill leaves `git diff --quiet src/utils/site-config.ts astro.config.mjs package.json` exiting 0

## Verification

Invoke the skill in a fresh session with a branding request such as "set up my site details". It should read the three config surfaces without being told where they are, print a table in which `SITE_TITLE`, the astro site URL and the package name are marked unconfigured while `PAGINATION_COUNT` is not, and then ask its four rounds with each current value offered as a keep-it option, the identity round carrying exactly four questions including the Starlight docs title.

Answer one round with new values and decline the rest. Then confirm three things: `git diff src/utils/site-config.ts` shows only right-hand-side changes with every `export const` name unchanged; `npx tsc --noEmit src/utils/site-config.ts` reports no error; and `npx vitest run tests/site-config-skill.test.ts` exits 0, which proves both the skill contract and the config shape guard still hold.

Finally run `grep -o 'install\|clone\|database' .claude/skills/site-config/SKILL.md | head` against the frontmatter description block and confirm no match, so the new skill cannot steal `project-setup`'s routing.

## Next Steps

- Document the site-config skill in project docs and the Starlight guide
  The project's CLAUDE.md asks that features be documented in both `project-docs/` and the Starlight guide; this plan deliberately ships the skill alone.
  ```text
  In the astro-basics repo, document the .claude/skills/site-config skill. Add a guide page under project-docs/02-guides/ describing what it configures and how to invoke it, add a matching Starlight page under src/content/docs/guide/ and register it in the Features sidebar array in astro.config.mjs. Verify by running `npm run build` and confirming the new guide page renders at its route.
  ```

- Wish list: a non-interactive `npm run site:setup` script
  A flags-driven CLI would let the same field map be applied in CI or a scaffolding step, mirroring `scripts/setup-wizard.js`.
  ```text
  In the astro-basics repo, add scripts/site-setup.js plus an `npm run site:setup` entry that applies the same field map as the .claude/skills/site-config skill from command-line flags (--title, --description, --logo, --url, --pagination), reusing the same values-only shape guard. Verify by running `npm run site:setup -- --title "Test" --dry-run` and confirming it prints the intended diff without writing.
  ```

## Resources

- src/utils/site-config.ts — the six exported constants the skill rewrites; re-exported via src/utils/index.ts:2 and imported by 18 files
- astro.config.mjs:15 — `site: process.env.SITE_URL || 'https://example.com'`, the reason the URL is env-delegated rather than a plain literal
- .claude/skills/project-setup/SKILL.md — the adjacent skill whose trigger words this one must avoid
- scripts/setup-wizard.js — the repo's existing 533-line readline wizard, the precedent this plan deliberately does not follow
