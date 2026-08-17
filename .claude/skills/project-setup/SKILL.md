---
name: project-setup
description: Walk a non-technical person through getting astro-basics running on their computer - clone, install, start the site, and turn on optional login/database features. Use when someone asks how to set up, install, run, or open this project, or when setup fails and they need plain-language help.
version: 0.1.0
---

# Project Setup (for non-technical users)

Get someone from "I have a link to this project" to "the website is open in my browser",
without assuming they know git, npm, or what an environment variable is.

## How to talk during this skill

- One instruction at a time. Wait for them to report back before continuing.
- Give the exact command to copy. Never say "run the usual install".
- Say what each step does in one short sentence, in plain words.
- Never show a stack trace and ask what they think. Read it yourself, then tell them
  what it means and what to do.
- Installing takes about 4 minutes. Say so up front so they do not think it froze.

## Step 0 - Check their computer is ready

Run this yourself, do not make them:

```bash
node -v && npm -v && git --version
```

- **Node 22 or higher** is what this project expects (see `.nvmrc`). Node 20 will
  probably work; below 20, stop and have them install Node first.
- **If any command is "not found"**, they are missing that tool. Point them to
  [nodejs.org](https://nodejs.org) (the "LTS" download) for node and npm, and note
  that git ships with Apple's Xcode command line tools on a Mac
  (`xcode-select --install`) or from [git-scm.com](https://git-scm.com) on Windows.
- Do not install these for them. Installers need their password and their choices.

## Step 1 - Get the project onto their computer

Skip this if they already have the folder.

```bash
git clone https://github.com/shawn-sandy/astro-basics.git
```

Then work inside the new `astro-basics` folder. Tell them where it landed - people
lose the folder more often than they hit a real error.

## Step 2 - Install

```bash
npm install
```

This downloads everything the project needs. About 4 minutes, and it prints a lot of
text that is not errors. Warnings about "deprecated" packages are normal and safe to
ignore.

## Step 3 - Create the settings file

```bash
cp .env.example .env
```

This makes a personal settings file from the template. **Leave the placeholder values
alone.** Every service reads an unreplaced `YOUR_SOMETHING` placeholder as "not set
up", switches that feature off, and lets the rest of the site run.

Say that out loud. Non-technical users assume the placeholders are a problem to solve
before they can continue. They are not.

## Step 4 - Start the site

```bash
npm run dev
```

The browser opens by itself at `http://localhost:4321`. Leave that terminal window
open - closing it stops the site. To stop it on purpose, click the terminal and
press `Ctrl+C`.

Use `npm run dev`, not `npm run start`. The styles are already built and committed,
so the extra style-watcher in `start` only matters for someone editing SCSS.

## Step 5 - Confirm it actually worked

Open the running site in the browser and confirm the homepage renders with styling.
Report what you saw.

**Do not verify by running `npm test` or `npm run type-check`.** Both fail on a clean
checkout of this project for reasons unrelated to their setup. Showing a
non-technical user a wall of red test output will convince them they broke something.

## When something goes wrong

Read the error yourself and match it here:

| What they see                                       | What it means                                                                 | What to tell them                                                                                         |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE` / port 4321 in use                     | Something else is already on that port, often an older copy of this same site | Close other terminal windows running the site, or run `npm run dev -- --port 4322`                        |
| `command not found: npm`                            | Node was never installed, or the terminal was open before installing          | Close the terminal, open a new one, try again. Still failing means install Node                           |
| `EACCES` / permission denied                        | npm is trying to write somewhere it is not allowed                            | Confirm they are in their own home folder, not `/usr/local` or a system folder                            |
| `npm install` fails partway                         | Usually a half-finished download                                              | `rm -rf node_modules package-lock.json` then `npm install` again                                          |
| Page loads but looks unstyled                       | The compiled stylesheet is missing                                            | `npm run sass:build`, then reload                                                                         |
| Red warning about Clerk keys in the terminal        | Expected on a fresh setup                                                     | Harmless. It means login is off, which is the default                                                     |
| Every page shows an error mentioning a config value | Some `.env` value is present but unusable                                     | `mv .env .env-saved`, `Ctrl+C`, start again. That puts them on a working site while you find the bad line |

Anything not on this list: read the error, explain it in one plain sentence, and say
what you are trying next. Do not paste the raw error at them.

## Optional - turning on login and the database

Only go here if they say they need it. Both cost time and require signing up for an
outside service, and neither is needed to browse the site.

They already have `.env` from Step 3. Each service is switched on by replacing its
placeholders there; placeholders left alone stay off. Restart the site after any edit -
`.env` is only read at startup.

**Login (Clerk).** They create a free account at [clerk.com](https://clerk.com), make
an application, and copy two keys from the API Keys page. Those replace
`YOUR_CLERK_PUBLISHABLE_KEY` and `YOUR_CLERK_SECRET_KEY`.

Never ask them to paste their secret key into the chat. Ask them to put it in the
`.env` file themselves, then confirm the placeholder is gone.

**Database.** Run the guided wizard and let it ask the questions:

```bash
npm run db:wizard
```

`npm run db:status` afterwards shows whether it connected.

## Done

Tell them, in this order: the site is running, the address is
`http://localhost:4321`, that terminal window has to stay open, and `Ctrl+C` stops
it. Then ask whether they want login or the database turned on.
