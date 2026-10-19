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

## Rules

- The spec is the Notion PRD: https://app.notion.com/p/3f860d3cf9f3819191bbf6fd71414f79. Read the section for the step you are building first; its "下一步" list is the build order.
- Pin every dependency to an exact version. Ask before adding one.
- Keep ESLint on 9.x: `eslint-plugin-react` does not support ESLint 10 yet.
- Keep TypeScript below 6.1: typescript-eslint 8 requires `<6.1.0`.
- Enable only lint rules that map to a rule id (`R01`, `R02`, ...). No `recommended` presets. Every rule in `lint/` carries a `// Rxx` comment.
- Rule ids are never renumbered or reused. New rules get the next id.
- Always run rr's own `node_modules/.bin/*`, never the reviewed project's copy.

## Gotchas

- Run rr's ESLint with the reviewed project root as cwd. With `--config`, ESLint 9 matches `files` globs and boundaries patterns against cwd; anything outside it is silently skipped as "outside of base path".
- A reviewed project's `eslint-disable` comment naming a rule rr does not load fails with "Definition for rule '...' was not found". Drop lint messages with no rule id instead of loading more plugins.
- `func-style` skips TS overloads but still flags generators, which R01 exempts. Filter that in the R01 exception check.
- `pnpm-workspace.yaml` denies the `unrs-resolver` build script. Its native binary arrives as an optional dependency; the script is only a fallback rebuild. Don't approve it to silence a warning.

## When unsure

If a change touches more than three files, or the rule id scheme or report format, propose the approach before writing code.
