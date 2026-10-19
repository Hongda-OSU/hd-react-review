---
name: react-review
description: Review React, HTML and CSS code against layered rules (consensus / project / personal), combining deterministic lint with judgment, and report in Chinese with severity and rule ids. Use when the user asks to review (审 / 审查 / review / 看看写得怎么样) React components, hooks, HTML or CSS files, a directory, or their uncommitted changes.
---

# rr: React / HTML code review

`<skill>` below means this skill's base directory. The review is read-only: never edit the reviewed project's files. When the prompt says `bin/rr.mjs` started the review, follow section 7 instead of sections 2, 5 and 6.

## 1. Scope

- A file or directory: review that path.
- "改动", "changed", "这次改的" or no path at all: add `--changed` (uncommitted changes, including untracked files), with the path if one was given.
- "不看个人偏好", "--no-personal": drop every `personal` rule (R01, R02, R07), from lint findings too.

## 2. Lint layer

Run `node <skill>/bin/lint.mjs [--changed] <path>` and parse the JSON on stdout.

- Exit code 2 prints the reason on stderr. When it is the file limit, propose batches by directory and ask; never review a silent subset.
- Any other failure, including exit 0 with no JSON: stop and tell the user the lint layer failed, with its stderr. Do not review without it or judge lint-only rules by eye.
- `project`: detected flags; a rule whose `requires` names a flag that is false is skipped.
- `findings`: lint results, already mapped to rule ids and deduplicated. They go into the report unless an exception below removes them.
- `scope.changedLines` (only with `--changed`): `"all"` or `[start, end]` ranges per file. Your own findings must sit on those lines, except R05 and R22, which span files.
- `parseErrors`: list them in the report; those files were not linted.
- `notes`: mention the ones that change what was checked (R02 off, tsc fallback, tsc config errors).

## 3. Rules

Rule files are in `<skill>/rules/`. Read the ones the scope needs:

| Files in scope | Rule files |
| --- | --- |
| `.tsx` `.jsx` `.ts` `.js` | `components-hooks.md`, `performance.md`, `ts-style-security.md`, `a11y-html.md` |
| `.css` only | `ts-style-security.md`, `a11y-html.md` |
| `.html` only | `a11y-html.md` |

Each rule has `layer`, `severity`, `checker` (`lint` / `claude` / `both`), optional `lint`, `requires` and `exceptions`, and for judged rules a "Judge" paragraph. Rules with `checker: lint` and no `exceptions` need nothing from you.

Then read `<skill>/prefs.md`. Apply rows whose scope is `global` or the project's `package.json` name, newest first: `veto` drops the rule, `downgrade` lowers severity one step (must → should → suggest), `modify` follows the reason.

## 4. Review

1. Group files: a component with the style files it imports and the custom hooks it uses from the scope. Read each group in full.
2. Apply every `claude` and `both` rule that is enabled, following its "Judge" paragraph.
3. Check lint findings of rules with `exceptions` (R01, R20); drop those an exception covers.
4. Do not repeat a problem lint already reported at the same place under the same rule.
5. When unsure, keep the finding and mark it 待确认 rather than guessing either way.

## 5. Report (in Chinese)

Rule ids, code, file paths and identifiers stay as written; everything else is Chinese. Labels:

- severity: must = 必改, should = 应改, suggest = 建议
- layer: consensus = 业界共识, project = 项目约定, personal = 个人偏好

Start with a summary table when more than one file is in scope, then one section per file with findings, most severe first:

```
汇总              必改  应改  建议
Button.tsx         1     1     1
Card.tsx           0     2     0

Button.tsx
  [必改 · 业界共识 · R16] 第 12 行：<div onClick> 应改成 <button>
      原因：div 不能被键盘聚焦和触发，读屏软件也不会把它当按钮
      建议：<button type="button" onClick={...}>
  [应改 · 业界共识 · R10 · 待确认] 第 20 行：……
```

- Each finding: the problem, 原因 from the rule's `why` applied to this code, and a concrete 建议.
- Group all R02 findings of a file into one item listing the lines.
- Files without findings are left out of the per-file sections; if nothing was found at all, say so in one line.
- End with 解析失败 (from `parseErrors`) and 说明 (relevant `notes`, skipped rules), only when non-empty.

## 6. Preferences

When the user vetoes, downgrades or rewrites a finding, offer to log it. On a yes, append one row to `<skill>/prefs.md` with today's date, the scope (`global` or the project's `package.json` name, never a path), the rule id, the action and the user's reason.

## 7. JSON mode (bin/rr.mjs)

`bin/rr.mjs` already ran the lint layer and put its JSON in the prompt, with personal findings removed when no-personal is true. You have Read, Glob and Grep only.

- Read every file in `scope.files` in full before judging, and list the ones you read in `reviewed`, exactly as they appear in `scope.files`.
- Do not run `bin/lint.mjs`. Do sections 3 and 4 as usual, but apply only `modify` rows of `prefs.md`; rr applies veto and downgrade itself.
- Skip R02 entirely; rr reports formatting itself.
- Return the structured output only. `findings`: every lint finding you keep, with `source: "lint"` and the same `file`, `line` and `ruleId`, plus your own with `source: "claude"`. `dropped`: lint findings an exception removes, with the reason.
- `file` is relative to the project root, as in the lint JSON. `problem`, `why` and `suggestion` are Chinese, following the wording rules of section 5. Use `confidence: "needs-check"` for 待确认.
