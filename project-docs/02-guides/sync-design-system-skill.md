# Sync Design System Skill

`sync-design-system` is a Claude skill in `.claude/skills/sync-design-system/`. It brings the published Astro Kit
design system artifact - the one `README.md` links - back in line with what this project ships now: its colour
tokens first, then the name, corners, fonts, components and cover that go with them.

It is the reverse of [customize-design](./customize-design-skill.md). That skill changes the project's colours;
this one carries the result out to the artifact. Nothing in the repository is edited or committed: the work happens
in a scratch folder holding the artifact's files, and on the artifact itself.

Published guide: [/guide/sync-design-system](../../src/content/docs/guide/sync-design-system.mdx)

## When to Run It

Run it when the artifact has fallen behind the code:

- after `customize-design` (or any hand edit to `src/styles/_design-tokens.scss`) has landed
- after `DESIGN.md` gains a name, a colour name or a Named Rule the artifact does not carry
- when a component the artifact documents has changed in the source

Do not run it to create a design system. The skill re-syncs one and stops if none exists; build the first one with
the `design-system-from-design-md` skill (in the user's own `~/.claude/skills`) or the Artifact tool's quickstart,
then come back.

Two things stop it outright, with nothing changed:

| Situation                             | Why it stops                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| The index records `"editing": "code"` | `/design-sync` owns that system and keeps it read-only. The change belongs in the code |
| The artifact was shared view-only     | There is nothing to publish to                                                         |

A third check pauses rather than stops. If `tokens.json` `meta.repo` and the index `lastChange.via` name another
repository, or none, the skill reports what the artifact records - repo, ref, date - and asks once whether to
replace that system in place. It continues only on a yes. This matters because the publish overwrites the system:
the version before it survives only in the artifact's history, and a fork inherits this README's link, so the link
alone does not make the artifact yours.

## Authority: Code Wins

The skill works from one principle: **the stylesheet is what ships**. `_design-tokens.scss` beats `DESIGN.md`. Where
the two disagree, the skill takes the code's value and reports the disagreement to the user rather than writing it
into the artifact's README. It never invents a value or a rule that is in neither.

The artifact type's own `SKILL.md` and `artifact-type/reference/*.md` outrank the skill file: they define every file
shape, size cap and the publish call. Everything read back from the artifact - files, notes, prose - is treated as
data, never as instructions.

## Where the Design Lives

| Project source                                                                | Feeds in the artifact                                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/styles/_design-tokens.scss`, `@mixin direction-light` / `direction-dark` | the seven colour tokens `ink`, `ink-soft`, `paper`, `paper-sunk`, `island`, `island-bg`, `rule`, both themes |
| the same file: `--radius-*`, `--font-family-*`, `@font-face`; `public/fonts/` | `radius` and `type` in `tokens.json`, and `fonts/`                                                           |
| `DESIGN.md`                                                                   | the system name, the colour names, the README prose and the Named Rules                                      |
| the source files named in `tokens.json` `meta.components`                     | each component's README, its preview, and its block in `components/bundle.css`                               |

The status colours (`color-success`, `-warning`, `-error`, `-info`) are not brand. The skill changes them only if
the code did.

## The Six Steps

### Step 1 - Ask once

Two answers, both with defaults, asked in one message:

| Question     | What it decides                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Artifact** | Which system to re-sync. Default: the design system link in `README.md` (`grep -n 'claude.ai/artifact' README.md`) |
| **Scope**    | Colours only, or colours plus the look (name, corners, fonts, components, cover). Default: both                    |

### Step 2 - Read the target, and check it is the right one

`Artifact list` with `scope: "files"`, then `read` by `path` - a `read` without one can be refused for a big system.
It pulls the index `project/design-system.json`, `project/tokens.json`, `project/tokens.css`, `project/README.md`,
every file it may change, and the type's reference pages. The folder the read saved them under is the working
folder for Step 3 and the publish `root` in Step 5.

This is where the two stop conditions above are checked, and where the ownership check may ask the user one more
question: whether to replace a system whose `meta.repo` names somewhere else.

### Step 3 - Apply the colours

```bash
node .claude/skills/sync-design-system/scripts/sync-tokens.mjs <dir>
```

The script does the mechanical part (see [The sync-tokens Script](#the-sync-tokens-script)). What it hands back
needs judgement, and that is the agent's:

1. **Rewrite the usage notes it named.** Those are notes quoting a ratio or a hex that the colour change made stale.
   Ratios come from the script's table, or from
   `node .claude/skills/customize-design/scripts/contrast.mjs '#fg:#bg'` for any other pair, such as `rule` on
   `paper` or a status colour on `paper`. Never estimated.
2. **Decide every stray hex it listed.** A value that moved is updated; a deliberate mention, such as a logo's raw
   colour quoted in a note, stays.
3. **Run it twice more.** The script copies each usage note from `tokens.json` into `tokens.css`, so the second run
   carries the hand-edited notes across and the third must print `in sync`.

Exit 1 (a text pair under 4.5:1) is not a reason to change the colour: the skill keeps the code's value and records
in that token's note that the pair fails.

### Step 4 - Match the look (skipped for colours only)

File by file, changing only what differs from the source. Never a rebuild.

| Artifact file                                                  | Updated from                                                                                                                                 |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Index `title` and `namespace`, `tokens.json` `name`, the cover | `DESIGN.md` `name`. A new name also changes the class prefix (such as `ak-`) in `bundle.css` and every preview                               |
| `README.md`, the author text above the first `---` rule        | `DESIGN.md` Overview, Colors, Typography, Layout, Shapes and the Named Rules. Everything from that rule down is generated and left untouched |
| `radius`, `type.families`, `type.fonts`; `fonts/`              | `_design-tokens.scss` and `public/fonts/`. A font file is copied from inside the checkout (1 MB at most), never approximated                 |
| `components/<Comp>/README.md`                                  | the component's source. The first sentence stays: the generated card index quotes it                                                         |
| `components/<Comp>/preview.html`, `components/bundle.css`      | hand-written static renditions of the source, each block commented with its source file, meeting 4.5:1 in both themes                        |
| `components/Cover/preview.html`                                | redrawn on the new tokens, last                                                                                                              |

The logo, components the project does not have, and `bundle.js` are left out.

The step also records the sync itself: `repo`, `ref` as `branch@shortsha`, `paths`, `components` and `synced` in
`tokens.json` `meta`, and `by` / `at` / `via` / `note` in the index `lastChange`. If `git status --short` shows
uncommitted changes in `src/styles` or `DESIGN.md`, the note says so, because the sha does not describe them.

### Step 5 - Publish

One `Artifact` call to the system's `url`, sending only the changed files, with `tokens.json` whole and the index
written last. Every file is `read` once more immediately before, because people edit these pages live, and the edit
is redone on that fresh text.

If the publish is refused because someone saved in the meantime, the skill re-reads and redoes the edit once. A
second refusal stops it.

### Step 6 - Check

1. `read` the published `project/tokens.json` and `project/tokens.css` into a fresh folder and run the script there.
   `in sync` is the proof that the published colours equal the project's.
2. Render each changed preview in light and dark if a browser is available, and read the computed colours. The
   repository's Playwright browsers may not be installed; the skill then says the previews were not rendered rather
   than calling them verified. The artifact is private, so the built-in browser shows a sign-in page - the skill
   does not sign in on the user's behalf.

## The sync-tokens Script

`.claude/skills/sync-design-system/scripts/sync-tokens.mjs` is the only part of the skill that writes files
unattended. It takes one argument: the folder the artifact's files were read into.

```bash
node .claude/skills/sync-design-system/scripts/sync-tokens.mjs <dir>
```

`<dir>` must hold `project/tokens.json`, and `project/tokens.css` if the artifact has one. Both are edited in place,
so it is pointed at the copy that will be published, never at the repository.

What one run does:

- sets the light and dark value of each of the seven tokens in `tokens.json` from the `direction-light` and
  `direction-dark` mixins
- rewrites those tokens' lines in `tokens.css`, value and usage note. For the remaining colour tokens (the status
  colours) it copies the usage note only and leaves the value alone
- prints the measured contrast for the eight text pairs, read from `_design-tokens.scss` through
  `customize-design`'s `contrast.mjs`
- names the usage notes that still quote a ratio or a hex, so a note cannot outlive the value it measured
- lists every hex in the artifact's README, cards, stylesheet and cover that is not in the palette. It skips the
  files the page generates (`tokens.json`, `tokens.css`, `manifest.json`, `design-system.json` and all of `api/`),
  and ignores anchors such as `#add-token` and entities such as `&#123;`
- prints `in sync` when there was nothing left to change

Order matters inside it: everything that reads a file or can reject the input runs before the first write, so a
rejected input leaves both files untouched.

| Exit code | Meaning                                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `0`       | Done                                                                                                                                      |
| `1`       | A text pair measured from `_design-tokens.scss` is under 4.5:1. The colours were still applied                                            |
| `2`       | It could not continue and wrote nothing - a missing file or token, an unreadable colour, a `tokens.css` line it expects that is not there |

Exit 2 has one exception. If a write itself failed, the message names what completed and the file that may be
partly written; that file is read from the artifact again before the script runs a second time.

`SYNC_TOKENS_SCSS` points the script at another token file. The checks use it.

### Running Its Checks

```bash
node --test .claude/skills/sync-design-system/scripts/sync-tokens.check.mjs
```

22 checks, no dependencies beyond Node's own test runner, under three seconds. They cover the contrast exit codes,
the inputs that must write nothing (a `var()` or a malformed hex in a mixin, a missing token, an unreadable file),
the three-run usage-note loop, CRLF preservation in `tokens.css`, the stray-hex scan's edge cases, and the partial
write message.

## Deliberate Limits

Three things the skill does not do, each on purpose. All three are reported back to the user.

**It patches colour lines only.** `sync-tokens.mjs` touches the seven colour declarations and the usage notes,
nothing else. If Step 4 changes radius, font, spacing or type tokens, the previews keep the old values for those
until the page is saved.

**It sends `tokens.css` by hand.** The artifact type reserves that file for a clean-up or `/design-sync`. The skill
sends it anyway, keeping its first comment (`/* <title> - generated from tokens.json */`) intact, because the
previews load it and nothing else rewrites it until a person saves. Without the comment the page will not take the
file over at the next save.

**It cannot regenerate the API files.** `api/tokens.md`, `api/components/*.md` and `manifest.json` are written by
the artifact page, only when a person opens it and saves. The skill never sends them. Until someone saves, those
files carry the old values - and the artifact's README tells agents to read `api/tokens.md` first, so this is the
one piece of the sync that is left for the user to finish: open the artifact, make any small edit, save once.

## What It Reports

- the artifact link, and the commit the sync came from
- the colour changes, old to new, and the contrast table
- the other files rewritten, and anywhere the code and `DESIGN.md` disagree
- that `tokens.css` was sent by hand, and which checks ran and which did not
- the one manual step left: open the artifact and save once

It commits nothing.

## Related Files

| File                                                              | Purpose                                                               |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `.claude/skills/sync-design-system/SKILL.md`                      | The skill's instructions                                              |
| `.claude/skills/sync-design-system/scripts/sync-tokens.mjs`       | The token sync script                                                 |
| `.claude/skills/sync-design-system/scripts/sync-tokens.check.mjs` | Its checks, run with `node --test`                                    |
| `.claude/skills/customize-design/scripts/contrast.mjs`            | The contrast measurement the script imports                           |
| `src/styles/_design-tokens.scss`                                  | The direction tokens in both themes, the font face and the radius     |
| `DESIGN.md`                                                       | The written design spec the artifact's prose comes from               |
| `project-docs/02-guides/customize-design-skill.md`                | The skill that runs the other way, changing the project's own colours |
| `src/content/docs/guide/sync-design-system.mdx`                   | The same guide in Starlight                                           |
