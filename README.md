<img src="assets/icon.png" width="128" height="128" alt="rr icon: a pixel-art owl in reading glasses on a pine branch">

# hd-react-review (rr)

A Claude Code skill that reviews React, HTML and CSS against industry standards and my own conventions. Lint catches what can be checked mechanically, Claude judges the rest, and every finding says how severe it is and whether it is industry consensus, a project convention or just personal preference.

https://github.com/user-attachments/assets/9afdce60-eb62-45f5-9157-2de4d25f1b6c

## Features

- 29 rules in three layers (consensus, project, personal), each finding tagged with severity, layer and rule id; the personal layer can be switched off per review
- Deterministic first: ESLint, stylelint, Prettier and `tsc` run before Claude, and Claude only reviews what they cannot, such as effect misuse, state placement, keyboard access and leaked secrets
- Nothing to install in the reviewed project, and nothing written to it; rr brings its own toolchain
- Review a file, a directory, or only your uncommitted changes
- Rules are Markdown; `pnpm test` fails if rules, lint config and test fixtures drift apart

## Tech Stack

- Claude Code skill: `SKILL.md` plus the rule files in `rules/`
- Node.js (ESM) lint runner in `bin/lint.mjs`
- ESLint 9 with typescript-eslint, react, react-hooks, jsx-a11y, boundaries and StyleX plugins; Prettier 3; stylelint 17; TypeScript 6

## Getting Started

### Prerequisites

- Node.js 20.19+
- pnpm 12+
- Claude Code; `rr`'s full review also needs the `claude` CLI on your PATH (`brew install --cask claude-code`)

### Installation

```bash
git clone https://github.com/Hongda-OSU/hd-react-review.git
cd hd-react-review
pnpm install
mkdir -p ~/.claude/skills
ln -s "$PWD" ~/.claude/skills/react-review
ln -s "$PWD/bin/rr.mjs" /opt/homebrew/bin/rr  # or any directory on your PATH
```

## Usage

In Claude Code, from any project, ask for a review:

```text
review src/components
review my uncommitted changes
review src/components, skip personal preferences
```

Or from a terminal:

```bash
rr                             # uncommitted changes: lint, then Claude
rr src/components              # a whole path
rr --no-personal src           # skip personal preferences
rr --lint-only src             # lint only: seconds, no Claude
```

The report is written in Chinese: a summary table, then each finding with its line, reason and a concrete fix.

To change how rr reviews, edit `rules/*.md`, or record a veto or downgrade in `prefs.md`. Then run:

```bash
pnpm test
```
