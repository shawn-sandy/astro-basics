---
name: verify
description: How to verify changes to astro-basics' Claude skills and their helper scripts at runtime - drive the script CLI against fake services, then run a headless Claude session through the skill.
---

# Verifying skill changes in astro-basics

Skills under `.claude/skills/` have two surfaces: the helper script's CLI, and the
agent that follows `SKILL.md`. Verify both. No build step is needed.

## Script CLI (example: auth-and-database-setup)

- Run it exactly as the skill does, from the repo root:
  `node --env-file=<file> .claude/skills/auth-and-database-setup/scripts/status.mjs`.
  Use one env file per scenario in the scratchpad, never the real `.env`.
- Spawn it with `env: {}` so shell variables do not leak into the scenario.
- For the Supabase probe, run local `http.createServer` fakes that answer
  `/rest/v1/users` with 200 `[]`, 404 `{"code":"PGRST205"}`, 401 `{"code":"42501"}`,
  401 `{"message":"Invalid API key"}`, a silent socket, and 401 headers with a stalled
  body. The timeout cases take about 10s each.
- Grep every captured output for the fake secrets, hosts and ports you fed in. The
  script's contract is that none of them are ever printed.
- To see what the app would really request, point `@supabase/supabase-js` (resolved
  from the repo's `node_modules`) at the same fake server.

## Agent

- Put a throwaway `.env` with fake keys in the worktree. Check that none exists first,
  and afterwards `mv` it to the scratchpad (`rm` is denied here).
- Run this, then parse the JSONL for `tool_use` entries. Check that the skill was chosen,
  that the script ran, that `.env` was never read, and that the fake keys never appear in
  the transcript.

  ```bash
  claude -p "is auth enabled?" --output-format stream-json --verbose --max-turns 10 \
    --allowedTools "Skill" "Read" "Glob" "Grep" \
    "Bash(node --env-file=.env .claude/skills/auth-and-database-setup/scripts/status.mjs)"
  ```

## Gotchas

- The script path is relative. Run it from anywhere but the repo root and it dies with
  a Node module-not-found stack trace.
- `npm test` and `tsc` fail on a clean checkout for reasons unrelated to skills. They are
  not verification here.
