# hd-react-review

rr: a local React / HTML code reviewer, built as a Claude skill plus its own lint toolchain. Reviewed projects must never need to install anything, and rr never writes to them.

## Stack

- Runtime: Node >= 20.19, ESM (`.mjs`)
- Package manager: **pnpm** (not npm, not yarn)
- Lint toolchain, all pinned to exact versions in `package.json`: ESLint 9, typescript-eslint 8, Prettier 3, stylelint 17, plus the react, react-hooks, jsx-a11y, boundaries and StyleX plugins

## Commands

| Purpose | Command |
| --- | --- |
| Install | `pnpm install` |
| Check rules, lint config and fixtures agree | `pnpm test` |
| Format rr's own code (fixtures and Markdown are ignored) | `npx prettier --write .` |
| Review from a terminal | `rr [--changed] [--no-personal] [--lint-only] <path>` |
| Lint layer only, JSON out | `node bin/lint.mjs [--changed] [--limit N] <path>` |

## Rules

- The spec is the Notion PRD: https://app.notion.com/p/3f860d3cf9f3819191bbf6fd71414f79. Read the section for the step you are building first; its "下一步" list is the build order.
- Pin every dependency to an exact version. Ask before adding one.
- Keep ESLint on 9.x: `eslint-plugin-react` does not support ESLint 10 yet.
- Keep TypeScript below 6.1: typescript-eslint 8 requires `<6.1.0`.
- Enable only lint rules that map to a rule id (`R01`, `R02`, ...). No `recommended` presets. Every rule in `lint/` carries a `// Rxx` comment.
- Rule ids are never renumbered or reused. New rules get the next id.
- `rules/*.md` is the source of truth. `lint/` comments, fixture annotations and the PRD table follow it.
- Reports are in Chinese; the code, rule files and `SKILL.md` stay English.
- `rr` gives `claude -p` only Read, Glob and Grep, and validates what comes back: lint findings are never lost, and only rules with `exceptions` may be dropped.
- Always use rr's own ESLint, stylelint and Prettier, never the reviewed project's copy. Only `tsc` prefers the project's own, falling back to rr's.
- Run `pnpm test` after touching `bin/`, `lint/`, `rules/` or `fixtures/`.
- Update `README.md` in the same commit as any command or install change. It stays English only.
- `fixtures/bad/` is wrong on purpose. Never format or fix it; `bad/src/lib/api.ts` must stay unformatted for R02.
- Fixture annotations apply to the next code line: `expect-lint: Rxx` (lint must report it), `expect-claude: Rxx` (only Claude can), `expect-none: Rxx` (must not reach the report). Update them whenever a rule changes.

## Gotchas

- Run rr's ESLint with the reviewed project root as cwd. With `--config`, ESLint 9 matches `files` globs and boundaries patterns against cwd; anything outside it is silently skipped as "outside of base path".
- A reviewed project's `eslint-disable` comment naming a rule rr does not load fails with "Definition for rule '...' was not found". Drop lint messages with no rule id instead of loading more plugins.
- `tsc` writes a `.tsbuildinfo` into the reviewed project unless given both `--incremental false` and `--composite false`; a composite config writes it even while rejecting the first flag alone.
- The skill runs `bin/lint.mjs` through the `~/.claude/skills/react-review` symlink, while `import.meta.url` is already resolved. Compare real paths; `pnpm test` covers this.
- `pnpm-workspace.yaml` denies the `unrs-resolver` build script. Its native binary arrives as an optional dependency; the script is only a fallback rebuild. Don't approve it to silence a warning.

## When unsure

If a change touches more than three files, or the rule id scheme or report format, propose the approach before writing code.
